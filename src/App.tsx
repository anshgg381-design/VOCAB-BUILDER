import { useEffect, useState } from 'react';
import { LivePreviewView } from './components/LivePreviewView';
import { LibraryDashboardView } from './components/LibraryDashboardView';
import { ExtensionFilesView } from './components/ExtensionFilesView';
import { InstallGuideView } from './components/InstallGuideView';
import { GoogleSheetsController } from './components/GoogleSheetsBar';
import { downloadExtensionZip } from './utils/extensionBundle';
import {
  clearCachedAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './utils/googleAuth';
import {
  ConnectedSheet,
  SheetAuthExpiredError,
  SheetInspection,
  appendEntryToSheet,
  createVocabularySpreadsheet,
  ensureSpreadsheetTabsAndHeaders,
  inspectSpreadsheet,
  parseSpreadsheetId,
  syncLibraryEntriesToSheet,
} from './utils/googleSheets';
import {
  CATEGORIES,
  Category,
  INITIAL_DEMO_ENTRIES,
  VocabEntry,
  findDuplicate,
  generateId,
  normalizeExpression,
  normalizeKey,
} from './utils/vocabLogic';

type ActiveSection = 'preview' | 'library' | 'files' | 'guide';

const STORAGE_KEY = 'cuet_vocab_workbench_entries_v1';
const SHEET_META_STORAGE_KEY = 'cuet_google_sheet_connection_v1';

export interface SheetSyncOutcome {
  attempted: boolean;
  synced: boolean;
  tabName?: string;
  error?: string;
}

export interface SaveAndAnalyseResult {
  ok: boolean;
  duplicate?: boolean;
  entry?: VocabEntry;
  error?: string;
  sheetSync?: SheetSyncOutcome;
}

function loadInitialEntries(): VocabEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DEMO_ENTRIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return INITIAL_DEMO_ENTRIES;
  } catch {
    return INITIAL_DEMO_ENTRIES;
  }
}

function loadSavedSheetConnection(): ConnectedSheet | null {
  try {
    const raw = window.localStorage.getItem(SHEET_META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.spreadsheetId === 'string' &&
      typeof parsed.spreadsheetUrl === 'string' &&
      typeof parsed.title === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [section, setSection] = useState<ActiveSection>('preview');
  const [entries, setEntries] = useState<VocabEntry[]>(loadInitialEntries);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Google Sheets OAuth state (access token is kept strictly in memory in googleAuth.ts)
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [connectedSheet, setConnectedSheet] = useState<ConnectedSheet | null>(loadSavedSheetConnection);
  const [isSheetBusy, setIsSheetBusy] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<{
    text: string;
    tone: 'ok' | 'error' | 'neutral';
  } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setIsSignedIn(true);
        setUserEmail(user.email || user.displayName || null);
      },
      () => {
        setIsSignedIn(false);
        setUserEmail(null);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      if (connectedSheet) {
        window.localStorage.setItem(SHEET_META_STORAGE_KEY, JSON.stringify(connectedSheet));
      } else {
        window.localStorage.removeItem(SHEET_META_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [connectedSheet]);

  const handleDownloadZip = async () => {
    if (downloadingZip) return;
    setDownloadingZip(true);
    try {
      await downloadExtensionZip();
    } catch (err) {
      console.error('Failed to build extension ZIP:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Ignore quota errors in restricted sandboxes
    }
  }, [entries]);

  const handleSheetAuthExpired = () => {
    clearCachedAccessToken();
    setIsSignedIn(false);
    setSheetStatus({
      text: 'Your Google Sheets session expired. Click Sign in with Google to resume automatic saving.',
      tone: 'error',
    });
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setSheetStatus(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setIsSignedIn(true);
        setUserEmail(result.user.email || result.user.displayName || null);
        if (connectedSheet) {
          setSheetStatus({
            text: `Signed in. Automatic saving to "${connectedSheet.title}" is active.`,
            tone: 'ok',
          });
        }
      }
    } catch (err) {
      setSheetStatus({
        text: err instanceof Error ? err.message : 'Could not sign in with Google.',
        tone: 'error',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logout();
    } finally {
      setIsSignedIn(false);
      setUserEmail(null);
      setSheetStatus(null);
    }
  };

  const handleCreateSheet = async (title: string) => {
    const token = await getAccessToken();
    if (!token) {
      handleSheetAuthExpired();
      return;
    }
    setIsSheetBusy(true);
    setSheetStatus({ text: 'Creating Google Sheet with Words, Idioms, and Phrasal Verbs tabs…', tone: 'neutral' });
    try {
      const created = await createVocabularySpreadsheet(token, title);
      setConnectedSheet(created);
      setSheetStatus({
        text: `Created "${created.title}" with 3 tabs (Words, Idioms, Phrasal Verbs). New entries will now save automatically.`,
        tone: 'ok',
      });
    } catch (err) {
      if (err instanceof SheetAuthExpiredError) {
        handleSheetAuthExpired();
      } else {
        setSheetStatus({
          text: err instanceof Error ? err.message : 'Could not create the Google Sheet.',
          tone: 'error',
        });
      }
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleInspectExistingSheet = async (input: string): Promise<SheetInspection | null> => {
    const spreadsheetId = parseSpreadsheetId(input);
    if (!spreadsheetId) {
      setSheetStatus({
        text: 'Could not find a valid Google Sheet ID in that link. Paste the full Google Sheets URL.',
        tone: 'error',
      });
      return null;
    }
    const token = await getAccessToken();
    if (!token) {
      handleSheetAuthExpired();
      return null;
    }
    setIsSheetBusy(true);
    setSheetStatus(null);
    try {
      return await inspectSpreadsheet(token, spreadsheetId);
    } catch (err) {
      if (err instanceof SheetAuthExpiredError) {
        handleSheetAuthExpired();
      } else {
        setSheetStatus({
          text: err instanceof Error ? err.message : 'Could not inspect that Google Sheet.',
          tone: 'error',
        });
      }
      return null;
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleConfirmConnectExisting = async (inspection: SheetInspection) => {
    const token = await getAccessToken();
    if (!token) {
      handleSheetAuthExpired();
      return;
    }
    setIsSheetBusy(true);
    setSheetStatus({ text: `Preparing tabs in "${inspection.title}"…`, tone: 'neutral' });
    try {
      const connected = await ensureSpreadsheetTabsAndHeaders(token, inspection);
      setConnectedSheet(connected);
      setSheetStatus({
        text: `Connected "${connected.title}". New entries will automatically append to Words, Idioms, and Phrasal Verbs.`,
        tone: 'ok',
      });
    } catch (err) {
      if (err instanceof SheetAuthExpiredError) {
        handleSheetAuthExpired();
      } else {
        setSheetStatus({
          text: err instanceof Error ? err.message : 'Could not prepare the Google Sheet.',
          tone: 'error',
        });
      }
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleSyncAllEntries = async () => {
    if (!connectedSheet) return;
    const token = await getAccessToken();
    if (!token) {
      handleSheetAuthExpired();
      return;
    }
    setIsSheetBusy(true);
    setSheetStatus({ text: 'Syncing saved entries to Google Sheet…', tone: 'neutral' });
    try {
      const { addedCount, skippedCount } = await syncLibraryEntriesToSheet(
        token,
        connectedSheet.spreadsheetId,
        entries
      );
      setSheetStatus({
        text:
          addedCount > 0
            ? `Synced ${addedCount} new ${addedCount === 1 ? 'entry' : 'entries'} to "${connectedSheet.title}" (${skippedCount} already in sheet).`
            : `All ${skippedCount} entries are already in "${connectedSheet.title}".`,
        tone: 'ok',
      });
    } catch (err) {
      if (err instanceof SheetAuthExpiredError) {
        handleSheetAuthExpired();
      } else {
        setSheetStatus({
          text: err instanceof Error ? err.message : 'Could not sync entries to Google Sheet.',
          tone: 'error',
        });
      }
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleSaveAndAnalyse = async (params: {
    expression: string;
    category: Category;
    contextSentence: string;
    sourceTitle: string;
    sourceUrl: string;
  }): Promise<SaveAndAnalyseResult> => {
    const cleaned = normalizeExpression(params.expression);
    if (!cleaned) {
      return { ok: false, error: 'Please enter a valid word, idiom, or phrasal verb.' };
    }

    const existing = findDuplicate(entries, cleaned);
    if (existing) {
      return {
        ok: false,
        duplicate: true,
        entry: existing,
        error: `"${existing.expression}" is already saved in ${CATEGORIES[existing.category]}.`,
      };
    }

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: cleaned,
          category: params.category,
          contextSentence: params.contextSentence,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok || !data?.analysis) {
        return {
          ok: false,
          error: data?.error || `Analysis failed (HTTP ${response.status}).`,
        };
      }

      const newEntry: VocabEntry = {
        id: generateId(),
        expression: data.analysis.expression,
        category: params.category,
        meaning: data.analysis.meaning,
        example: data.analysis.example,
        contextSentence: params.contextSentence.trim(),
        sourceTitle: params.sourceTitle.trim(),
        sourceUrl: params.sourceUrl.trim(),
        dateAdded: new Date().toISOString(),
        learned: false,
        favourite: false,
      };

      setEntries((prev) => {
        if (findDuplicate(prev, newEntry.expression)) return prev;
        return [newEntry, ...prev];
      });

      // Automatically save to connected Google Sheet immediately after fetching the meaning
      let sheetSync: SheetSyncOutcome = { attempted: false, synced: false };
      const token = await getAccessToken();
      if (token && connectedSheet) {
        sheetSync.attempted = true;
        try {
          const { tabName } = await appendEntryToSheet(token, connectedSheet.spreadsheetId, newEntry);
          sheetSync = { attempted: true, synced: true, tabName };
          setSheetStatus({
            text: `Auto-saved "${newEntry.expression}" to "${connectedSheet.title}" (${tabName} tab).`,
            tone: 'ok',
          });
        } catch (sheetErr) {
          if (sheetErr instanceof SheetAuthExpiredError) {
            handleSheetAuthExpired();
            sheetSync = {
              attempted: true,
              synced: false,
              error: 'Google Sheets session expired — sign in again to resume auto-save.',
            };
          } else {
            const msg = sheetErr instanceof Error ? sheetErr.message : 'Google Sheets append failed.';
            setSheetStatus({
              text: `Saved locally, but could not append "${newEntry.expression}" to Google Sheet: ${msg}`,
              tone: 'error',
            });
            sheetSync = { attempted: true, synced: false, error: msg };
          }
        }
      }

      return { ok: true, entry: newEntry, sheetSync };
    } catch {
      return { ok: false, error: 'Could not reach the analysis service. Please try again.' };
    }
  };

  const handleUpdateEntry = (id: string, patch: Partial<VocabEntry>) => {
    const current = entries.find((e) => e.id === id);
    if (!current) return { ok: false, error: 'Entry not found.' };

    if (typeof patch.expression === 'string') {
      const nextExpr = normalizeExpression(patch.expression);
      if (!nextExpr) return { ok: false, error: 'Expression cannot be empty.' };
      if (normalizeKey(nextExpr) !== normalizeKey(current.expression)) {
        const dup = entries.find((e) => e.id !== id && normalizeKey(e.expression) === normalizeKey(nextExpr));
        if (dup) {
          return { ok: false, error: `"${dup.expression}" already exists in your library.` };
        }
      }
      patch = { ...patch, expression: nextExpr };
    }

    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    return { ok: true };
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleClearAll = () => {
    setEntries([]);
  };

  const handleReanalyseEntry = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    if (!target) return { ok: false, error: 'Entry not found.' };

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: target.expression,
          category: target.category,
          contextSentence: target.contextSentence,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok || !data?.analysis) {
        return { ok: false, error: data?.error || 'Reanalysis failed.' };
      }

      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                expression: data.analysis.expression,
                meaning: data.analysis.meaning,
                example: data.analysis.example,
              }
            : e
        )
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach the analysis service.' };
    }
  };

  const sheetsController: GoogleSheetsController = {
    isSignedIn,
    isSigningIn,
    userEmail,
    connectedSheet,
    isBusy: isSheetBusy,
    statusMessage: sheetStatus,
    onSignIn: handleGoogleSignIn,
    onSignOut: handleGoogleSignOut,
    onCreateSheet: handleCreateSheet,
    onInspectExistingSheet: handleInspectExistingSheet,
    onConfirmConnectExisting: handleConfirmConnectExisting,
    onSyncAllEntries: handleSyncAllEntries,
    onDisconnectSheet: () => {
      setConnectedSheet(null);
      setSheetStatus(null);
    },
    onDismissStatus: () => setSheetStatus(null),
    totalEntriesCount: entries.length,
  };

  const navItems: Array<{ id: ActiveSection; label: string }> = [
    { id: 'preview', label: 'Live Preview' },
    { id: 'library', label: 'My CUET Library' },
    { id: 'files', label: 'Extension Files' },
    { id: 'guide', label: 'Install Guide' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Strictly compliant 3-zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 md:gap-8">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={() => setSection('preview')}
            className="font-editorial text-[15px] sm:text-[18px] font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            CUET Vocabulary Builder
          </button>

          {/* Zone 2: 4 clean single-line text nav links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`text-sm font-medium whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                    active
                      ? 'text-slate-900 border-b-2 border-teal-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="h-9 px-3 sm:px-4 inline-flex items-center justify-center text-[12.5px] sm:text-[13px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="sm:hidden">{downloadingZip ? 'Zipping…' : 'Download ZIP'}</span>
            <span className="hidden sm:inline">{downloadingZip ? 'Preparing ZIP…' : 'Download Extension ZIP'}</span>
          </button>
        </div>

        {/* Compact Mobile Navigation Row (only below md) */}
        <nav
          aria-label="Mobile navigation"
          className="flex md:hidden items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100"
        >
          {navItems.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`text-[12px] font-medium whitespace-nowrap shrink-0 pb-0.5 cursor-pointer ${
                  active ? 'text-slate-900 border-b-2 border-teal-700' : 'text-slate-600'
                }`}
              >
                {item.id === 'library' ? 'Library' : item.id === 'files' ? 'Files' : item.id === 'guide' ? 'Install' : 'Preview'}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-16">
        {section === 'preview' && (
          <LivePreviewView
            entries={entries}
            sheets={sheetsController}
            onSaveAndAnalyse={handleSaveAndAnalyse}
            onOpenLibrary={() => setSection('library')}
            onOpenInstallGuide={() => setSection('guide')}
          />
        )}

        {section === 'library' && (
          <LibraryDashboardView
            entries={entries}
            sheets={sheetsController}
            onSaveAndAnalyse={handleSaveAndAnalyse}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            onClearAll={handleClearAll}
            onReanalyseEntry={handleReanalyseEntry}
            onMergeImported={(merged) => setEntries(merged)}
          />
        )}

        {section === 'files' && <ExtensionFilesView />}

        {section === 'guide' && <InstallGuideView />}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>CUET UG 2027 Vocabulary Collector — Brave Desktop Extension (Manifest V3)</span>
          <span>Local storage + optional Google Sheets auto-save (Words · Idioms · Phrasal Verbs)</span>
        </div>
      </footer>
    </div>
  );
}
