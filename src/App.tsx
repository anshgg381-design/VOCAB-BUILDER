import { useEffect, useMemo, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { LivePreviewView } from './components/LivePreviewView';
import { LibraryDashboardView } from './components/LibraryDashboardView';
import { InstallGuideView } from './components/InstallGuideView';
import { HowItWorksView } from './components/HowItWorksView';
import { GoogleSheetsController } from './components/GoogleSheetsBar';
import { DailyGoalHeaderWidget } from './components/DailyGoalHeaderWidget';
import { downloadExtensionZip } from './utils/extensionBundle';
import {
  appendEntryViaAppsScript,
  isValidAppsScriptUrl,
  pullLibraryViaAppsScript,
  syncLibraryViaAppsScript,
  validateAppsScriptUrlInput,
} from './utils/googleSheets';
import {
  CATEGORIES,
  Category,
  DEFAULT_DAILY_GOAL,
  ExamTargetConfig,
  INITIAL_DEMO_ENTRIES,
  VocabEntry,
  calculateReviewPatch,
  clampDailyGoal,
  computeDailyGoalStats,
  findDuplicate,
  generateId,
  mergePulledSheetEntries,
  normalizeExpression,
  normalizeKey,
  recordEntryMissPatch,
} from './utils/vocabLogic';

type ActiveSection = 'preview' | 'library' | 'howItWorks' | 'guide';
type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'cuet_vocab_workbench_entries_v1';
const APPS_SCRIPT_STORAGE_KEY = 'cuet_apps_script_webhook_v1';
const DAILY_GOAL_STORAGE_KEY = 'cuet_daily_goal_target_v1';
const EXAM_COUNTDOWN_STORAGE_KEY = 'cuet_exam_countdown_v1';
const THEME_STORAGE_KEY = 'cuet_theme_mode_v1';

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

function loadSavedDailyGoal(): number {
  try {
    const raw = window.localStorage.getItem(DAILY_GOAL_STORAGE_KEY);
    if (!raw) return DEFAULT_DAILY_GOAL;
    return clampDailyGoal(Number(raw));
  } catch {
    return DEFAULT_DAILY_GOAL;
  }
}

function loadSavedAppsScriptUrl(): string | null {
  try {
    const raw = window.localStorage.getItem(APPS_SCRIPT_STORAGE_KEY);
    if (raw && isValidAppsScriptUrl(raw)) {
      return raw.trim();
    }
    return null;
  } catch {
    return null;
  }
}

function loadSavedExamConfig(): ExamTargetConfig | null {
  try {
    const raw = window.localStorage.getItem(EXAM_COUNTDOWN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.examDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.examDate)
    ) {
      return {
        examName: typeof parsed.examName === 'string' && parsed.examName.trim() ? parsed.examName.trim() : 'CUET',
        examDate: parsed.examDate,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function loadSavedTheme(): ThemeMode {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function App() {
  const [section, setSection] = useState<ActiveSection>('preview');
  const [entries, setEntries] = useState<VocabEntry[]>(loadInitialEntries);
  const [dailyGoalTarget, setDailyGoalTarget] = useState<number>(loadSavedDailyGoal);
  const [examConfig, setExamConfig] = useState<ExamTargetConfig | null>(loadSavedExamConfig);
  const [themeMode, setThemeMode] = useState<ThemeMode>(loadSavedTheme);
  const [isCelebratingGoal, setIsCelebratingGoal] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const dailyGoalStats = useMemo(
    () => computeDailyGoalStats(entries, dailyGoalTarget),
    [entries, dailyGoalTarget]
  );
  const prevGoalReachedRef = useRef<boolean>(dailyGoalStats.goalReached);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage quota errors
    }
  }, [themeMode]);

  useEffect(() => {
    try {
      if (examConfig) {
        window.localStorage.setItem(EXAM_COUNTDOWN_STORAGE_KEY, JSON.stringify(examConfig));
      } else {
        window.localStorage.removeItem(EXAM_COUNTDOWN_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [examConfig]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [section]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DAILY_GOAL_STORAGE_KEY, String(dailyGoalTarget));
    } catch {
      // Ignore storage quota errors
    }
  }, [dailyGoalTarget]);

  useEffect(() => {
    const wasReached = prevGoalReachedRef.current;
    prevGoalReachedRef.current = dailyGoalStats.goalReached;
    if (!wasReached && dailyGoalStats.goalReached) {
      setIsCelebratingGoal(true);
      const timer = window.setTimeout(() => setIsCelebratingGoal(false), 3600);
      return () => window.clearTimeout(timer);
    }
    if (!dailyGoalStats.goalReached) {
      setIsCelebratingGoal(false);
    }
  }, [dailyGoalStats.goalReached]);

  // Google Sheets Apps Script state
  const [appsScriptUrl, setAppsScriptUrl] = useState<string | null>(loadSavedAppsScriptUrl);
  const [isSheetBusy, setIsSheetBusy] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<{
    text: string;
    tone: 'ok' | 'error' | 'neutral';
  } | null>(null);

  useEffect(() => {
    try {
      if (appsScriptUrl) {
        window.localStorage.setItem(APPS_SCRIPT_STORAGE_KEY, appsScriptUrl);
      } else {
        window.localStorage.removeItem(APPS_SCRIPT_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [appsScriptUrl]);

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

  const handleTestAndConnectAppsScript = async (
    rawUrl: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const validation = validateAppsScriptUrlInput(rawUrl);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    setIsSheetBusy(true);
    try {
      await appendEntryViaAppsScript(validation.url, {
        category: 'vocabulary',
        expression: '',
        meaning: '',
        example: '',
        testOnly: true,
      });
      setAppsScriptUrl(validation.url);
      setSheetStatus({
        text: 'Apps Script deployment connected. Newly analysed words will automatically save to your Google Sheet.',
        tone: 'ok',
      });
      return { ok: true };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not verify the Apps Script deployment URL.';
      return { ok: false, error: msg };
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handleDisconnectAppsScript = () => {
    setAppsScriptUrl(null);
    setSheetStatus(null);
  };

  const handleSyncAllEntries = async () => {
    if (!appsScriptUrl) return;
    setIsSheetBusy(true);
    setSheetStatus({ text: 'Syncing saved entries via Apps Script…', tone: 'neutral' });
    try {
      const { addedCount, skippedCount } = await syncLibraryViaAppsScript(
        appsScriptUrl,
        entries
      );
      setSheetStatus({
        text:
          addedCount > 0
            ? `Synced ${addedCount} new ${addedCount === 1 ? 'entry' : 'entries'} to your Google Sheet (${skippedCount} already present).`
            : `All ${skippedCount} entries are already in your Google Sheet.`,
        tone: 'ok',
      });
    } catch (err) {
      setSheetStatus({
        text:
          err instanceof Error
            ? err.message
            : 'Could not sync entries via Apps Script deployment.',
        tone: 'error',
      });
    } finally {
      setIsSheetBusy(false);
    }
  };

  const handlePullFromSheet = async () => {
    if (!appsScriptUrl) return;
    setIsSheetBusy(true);
    setSheetStatus({ text: 'Pulling rows from Google Sheet via Apps Script…', tone: 'neutral' });
    try {
      const rows = await pullLibraryViaAppsScript(appsScriptUrl);
      const merged = mergePulledSheetEntries(entries, rows);
      setEntries(merged.mergedEntries);
      setSheetStatus({
        text: `Pulled from Google Sheet: ${merged.addedCount} added, ${merged.updatedCount} updated (${merged.unchangedCount} unchanged).`,
        tone: 'ok',
      });
    } catch (err) {
      setSheetStatus({
        text:
          err instanceof Error
            ? err.message
            : 'Could not pull entries via Apps Script deployment.',
        tone: 'error',
      });
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
        masteryLevel: 'new',
        favourite: false,
      };

      setEntries((prev) => {
        if (findDuplicate(prev, newEntry.expression)) return prev;
        return [newEntry, ...prev];
      });

      // Automatically save to connected Google Sheet (Apps Script Web App) immediately after fetching the meaning
      let sheetSync: SheetSyncOutcome = { attempted: false, synced: false };
      if (appsScriptUrl) {
        sheetSync.attempted = true;
        try {
          const { tabName } = await appendEntryViaAppsScript(appsScriptUrl, {
            category: newEntry.category,
            expression: newEntry.expression,
            meaning: newEntry.meaning,
            example: newEntry.example,
          });
          sheetSync = { attempted: true, synced: true, tabName };
          setSheetStatus({
            text: `Auto-saved "${newEntry.expression}" to your Google Sheet (${tabName} tab) via Apps Script.`,
            tone: 'ok',
          });
        } catch (scriptErr) {
          const msg =
            scriptErr instanceof Error ? scriptErr.message : 'Apps Script append failed.';
          setSheetStatus({
            text: `Saved locally, but could not append "${newEntry.expression}" via Apps Script: ${msg}`,
            tone: 'error',
          });
          sheetSync = { attempted: true, synced: false, error: msg };
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

    if (patch.masteryLevel) {
      const srsPatch =
        patch.nextReviewAt !== undefined
          ? { masteryLevel: patch.masteryLevel, learned: patch.masteryLevel === 'mastered' }
          : calculateReviewPatch(current, patch.masteryLevel, { countAsReview: true });
      patch = { ...patch, ...srsPatch };
    } else if (typeof patch.learned === 'boolean') {
      const nextMastery = patch.learned ? 'mastered' : 'new';
      const srsPatch = calculateReviewPatch(current, nextMastery, { countAsReview: true });
      patch = { ...patch, ...srsPatch };
    }

    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    return { ok: true };
  };

  const handleBulkUpdateEntries = (
    ids: string[],
    patch: Partial<Pick<VocabEntry, 'masteryLevel' | 'category'>>
  ) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setEntries((prev) =>
      prev.map((entry) => {
        if (!idSet.has(entry.id)) return entry;
        let nextPatch: Partial<VocabEntry> = { ...patch };
        if (patch.masteryLevel) {
          nextPatch = {
            ...nextPatch,
            ...calculateReviewPatch(entry, patch.masteryLevel, { countAsReview: true }),
          };
        }
        return { ...entry, ...nextPatch };
      })
    );
  };

  const handleRecordEntryMiss = (id: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, ...recordEntryMissPatch(entry) } : entry
      )
    );
  };

  const handleDeleteEntries = (ids: string[]): Array<{ entry: VocabEntry; index: number }> => {
    const idSet = new Set(ids);
    const removed: Array<{ entry: VocabEntry; index: number }> = [];
    entries.forEach((entry, index) => {
      if (idSet.has(entry.id)) {
        removed.push({ entry, index });
      }
    });
    if (removed.length > 0) {
      setEntries((prev) => prev.filter((e) => !idSet.has(e.id)));
    }
    return removed;
  };

  const handleRestoreEntries = (items: Array<{ entry: VocabEntry; index: number }>) => {
    if (items.length === 0) return;
    setEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const next = [...prev];
      const sorted = [...items].sort((a, b) => a.index - b.index);
      for (const item of sorted) {
        if (existingIds.has(item.entry.id)) continue;
        const insertAt = Math.max(0, Math.min(item.index, next.length));
        next.splice(insertAt, 0, item.entry);
        existingIds.add(item.entry.id);
      }
      return next;
    });
  };

  const handleDeleteEntry = (id: string) => {
    handleDeleteEntries([id]);
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
    appsScriptUrl,
    isBusy: isSheetBusy,
    statusMessage: sheetStatus,
    onSyncAllEntries: handleSyncAllEntries,
    onPullFromSheet: handlePullFromSheet,
    onTestAndConnectAppsScript: handleTestAndConnectAppsScript,
    onDisconnectAppsScript: handleDisconnectAppsScript,
    onDismissStatus: () => setSheetStatus(null),
    totalEntriesCount: entries.length,
    entries,
  };

  const navItems: Array<{ id: ActiveSection; label: string }> = [
    { id: 'preview', label: 'Live Preview' },
    { id: 'library', label: 'THE VOCAB VAULT' },
    { id: 'howItWorks', label: 'How It Works' },
    { id: 'guide', label: 'Install Guide' },
  ];

  return (
    <div className="min-h-screen flex flex-col text-[#002962] dark:text-[#E8EEF7]">
      {/* Clean 3-zone Top Bar styled in Nesoi architectural warm stone & midnight navy */}
      <header className="sticky top-0 z-30 bg-[#F5F3F0]/90 dark:bg-[#0B1220]/90 backdrop-blur-md border-b border-[#002962]/10 dark:border-[#94B3DB]/18">
        <div className="max-w-[1260px] mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3 xl:gap-6">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={() => setSection('preview')}
            className="text-[12.5px] sm:text-[15.5px] font-bold tracking-[-0.02em] text-[#002962] dark:text-[#E8EEF7] whitespace-nowrap truncate min-w-0 cursor-pointer"
          >
            IPMAT/CUET VOCAB BUILDER
          </button>

          {/* Zone 2: Clean single-line text nav links */}
          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-4 xl:gap-6">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`text-[13.5px] font-medium whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                    active
                      ? 'text-[#002962] dark:text-white font-semibold border-b-2 border-[#EA580C]'
                      : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Daily Goal + Night Study Toggle + Nesoi architectural CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <DailyGoalHeaderWidget
              stats={dailyGoalStats}
              isCelebrating={isCelebratingGoal}
              onUpdateTarget={(nextTarget) => setDailyGoalTarget(clampDailyGoal(nextTarget))}
            />
            <button
              type="button"
              data-testid="theme-toggle"
              onClick={() => setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))}
              aria-label={
                themeMode === 'dark'
                  ? 'Switch to light study theme'
                  : 'Switch to dark night study theme'
              }
              title={themeMode === 'dark' ? 'Light theme' : 'Night Study dark theme'}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-[#002962]/18 dark:border-[#94B3DB]/25 bg-[#002962]/[0.05] dark:bg-[#17253D] text-[#002962] dark:text-[#FDBA74] hover:bg-[#002962]/[0.09] dark:hover:bg-[#1F3150] transition-colors shrink-0 cursor-pointer"
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="h-9 px-3 sm:px-4 inline-flex items-center justify-center text-[12.5px] sm:text-[13px] font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="sm:hidden">{downloadingZip ? 'Zipping…' : 'ZIP'}</span>
              <span className="hidden sm:inline">
                {downloadingZip ? 'Preparing ZIP…' : 'Download Extension ZIP'}
              </span>
            </button>
          </div>
        </div>

        {/* Compact Tablet & Mobile Navigation Row */}
        <nav
          aria-label="Mobile navigation"
          className="flex lg:hidden items-center justify-between gap-2 px-4 py-2.5 border-t border-[#002962]/10 dark:border-[#94B3DB]/18 overflow-x-auto"
        >
          {navItems.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`text-[12px] font-medium whitespace-nowrap shrink-0 pb-0.5 cursor-pointer ${
                  active
                    ? 'text-[#002962] dark:text-white font-semibold border-b-2 border-[#EA580C]'
                    : 'text-[#3B5578] dark:text-[#9FB3CE]'
                }`}
              >
                {item.id === 'library'
                  ? 'Vocab Vault'
                  : item.id === 'howItWorks'
                  ? 'How It Works'
                  : item.id === 'guide'
                  ? 'Install'
                  : 'Preview'}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1220px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-16">
        {section === 'preview' && (
          <LivePreviewView
            entries={entries}
            sheets={sheetsController}
            onSaveAndAnalyse={handleSaveAndAnalyse}
            onOpenLibrary={() => setSection('library')}
            onOpenInstallGuide={() => setSection('guide')}
            onOpenHowItWorks={() => setSection('howItWorks')}
          />
        )}

        {section === 'library' && (
          <LibraryDashboardView
            entries={entries}
            sheets={sheetsController}
            examConfig={examConfig}
            onUpdateExamConfig={setExamConfig}
            onSaveAndAnalyse={handleSaveAndAnalyse}
            onUpdateEntry={handleUpdateEntry}
            onBulkUpdateEntries={handleBulkUpdateEntries}
            onRecordEntryMiss={handleRecordEntryMiss}
            onDeleteEntry={handleDeleteEntry}
            onDeleteEntries={handleDeleteEntries}
            onRestoreEntries={handleRestoreEntries}
            onClearAll={handleClearAll}
            onReanalyseEntry={handleReanalyseEntry}
            onMergeImported={(merged) => setEntries(merged)}
            onOpenInstallGuide={() => setSection('guide')}
          />
        )}

        {section === 'howItWorks' && (
          <HowItWorksView
            onOpenPreview={() => setSection('preview')}
            onOpenInstallGuide={() => setSection('guide')}
            onOpenLibrary={() => setSection('library')}
          />
        )}

        {section === 'guide' && <InstallGuideView />}
      </main>

      <footer className="border-t border-[#002962]/10 dark:border-[#94B3DB]/18 bg-white/80 dark:bg-[#0F172A]/90">
        <div className="max-w-[1220px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#3B5578] dark:text-[#9FB3CE]">
          <span>IPMAT/CUET VOCAB BUILDER — Manifest V3 (Chrome · Brave · Edge · Vivaldi · Opera · Arc · Chromium)</span>
          <span>Local storage + optional Google Sheets auto-save (Words · Idioms · Phrasal Verbs)</span>
        </div>
      </footer>
    </div>
  );
}
