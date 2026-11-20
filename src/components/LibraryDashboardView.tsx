import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  FileDown,
  Filter,
  RotateCcw,
  Search,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { GoogleSheetsBar, GoogleSheetsController } from './GoogleSheetsBar';
import { ExamCountdownBar } from './ExamCountdownBar';
import { StudyModePanel } from './StudyModePanel';
import { QuizModePanel } from './QuizModePanel';
import { LibraryInsightsPanel } from './LibraryInsightsPanel';
import { MasteryBadgesPanel } from './MasteryBadgesPanel';
import { canSpeakExpression, speakExpression } from '../utils/speech';
import {
  PdfCategoryFilter,
  PdfSortOrder,
  downloadStudySheetPdf,
  getPdfCategoryLabel,
} from '../utils/pdfExport';
import {
  CATEGORIES,
  Category,
  ExamTargetConfig,
  LibraryMasteryFilter,
  LibrarySortOrder,
  MASTERY_LABELS,
  StudyOutcome,
  StudyScope,
  VALID_MASTERY_LEVELS,
  VocabEntry,
  buildAnkiTsv,
  buildCsv,
  buildExportJson,
  detectCategory,
  filterAndSortEntries,
  formatDate,
  formatEntryCopyText,
  getCategoryCounts,
  getDailyReviewQueue,
  getEntryReviewSchedule,
  getMasteryLevel,
  getMasteryStats,
  getMissCount,
  getStudyMasteryForOutcome,
  getUniqueSources,
  isNeedsPractice,
  parseBulkInput,
  validateAndMergeImport,
} from '../utils/vocabLogic';

interface SheetSyncOutcome {
  attempted: boolean;
  synced: boolean;
  tabName?: string;
  error?: string;
}

interface RemovedEntryRecord {
  entry: VocabEntry;
  index: number;
}

interface LibraryDashboardViewProps {
  entries: VocabEntry[];
  sheets: GoogleSheetsController;
  examConfig: ExamTargetConfig | null;
  onUpdateExamConfig: (next: ExamTargetConfig | null) => void;
  onSaveAndAnalyse: (params: {
    expression: string;
    category: Category;
    contextSentence: string;
    sourceTitle: string;
    sourceUrl: string;
  }) => Promise<{ ok: boolean; duplicate?: boolean; entry?: VocabEntry; error?: string; sheetSync?: SheetSyncOutcome }>;
  onUpdateEntry: (id: string, patch: Partial<VocabEntry>) => { ok: boolean; error?: string };
  onBulkUpdateEntries: (
    ids: string[],
    patch: Partial<Pick<VocabEntry, 'masteryLevel' | 'category'>>
  ) => void;
  onRecordEntryMiss: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteEntries: (ids: string[]) => RemovedEntryRecord[];
  onRestoreEntries: (items: RemovedEntryRecord[]) => void;
  onClearAll: () => void;
  onReanalyseEntry: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onMergeImported: (merged: VocabEntry[]) => void;
  onOpenInstallGuide?: () => void;
}

const UNDO_TOAST_DURATION_MS = 5000;

export const LibraryDashboardView: React.FC<LibraryDashboardViewProps> = ({
  entries,
  sheets,
  examConfig,
  onUpdateExamConfig,
  onSaveAndAnalyse,
  onUpdateEntry,
  onBulkUpdateEntries,
  onRecordEntryMiss,
  onDeleteEntries,
  onRestoreEntries,
  onClearAll,
  onReanalyseEntry,
  onMergeImported,
  onOpenInstallGuide,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LibraryMasteryFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<LibrarySortOrder>('recent');

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [libraryMode, setLibraryMode] = useState<'list' | 'study' | 'quiz'>('list');
  const [studyInitialScope, setStudyInitialScope] = useState<StudyScope>('all');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Undo delete toast state (5 seconds)
  const [undoDeleteState, setUndoDeleteState] = useState<{
    items: RemovedEntryRecord[];
    label: string;
    key: number;
  } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  // Add / Bulk panel state
  const [bulkText, setBulkText] = useState('');
  const [bulkCategory, setBulkCategory] = useState<'auto' | Category>('auto');
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{
    summary: string;
    details: Array<{ text: string; isError: boolean }>;
  } | null>(null);

  // Backup paste-import state
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [pasteImportText, setPasteImportText] = useState('');

  // Toast feedback
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [reanalysingId, setReanalysingId] = useState<string | null>(null);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<VocabEntry | null>(null);
  const [editExpression, setEditExpression] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('vocabulary');
  const [editMeaning, setEditMeaning] = useState('');
  const [editExample, setEditExample] = useState('');
  const [editError, setEditError] = useState('');

  // Confirm modal state (for Clear Entire Library)
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Download as PDF study sheet modal state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfCategory, setPdfCategory] = useState<PdfCategoryFilter>('all');
  const [pdfSortOrder, setPdfSortOrder] = useState<PdfSortOrder>('az');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmState) setConfirmState(null);
        else if (editingEntry) setEditingEntry(null);
        else if (showPdfModal) setShowPdfModal(false);
        return;
      }
      if (
        e.key === '/' &&
        libraryMode === 'list' &&
        !confirmState &&
        !editingEntry &&
        !showPdfModal
      ) {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable);
        if (!isEditable && searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editingEntry, confirmState, showPdfModal, libraryMode]);

  const counts = useMemo(() => getCategoryCounts(entries), [entries]);
  const masteryStats = useMemo(() => getMasteryStats(entries), [entries]);
  const reviewQueue = useMemo(() => getDailyReviewQueue(entries), [entries]);
  const uniqueSources = useMemo(() => getUniqueSources(entries), [entries]);
  const needsPracticeCount = useMemo(
    () => entries.filter((entry) => isNeedsPractice(entry)).length,
    [entries]
  );

  // Keep source filter valid if entries with that source are removed
  useEffect(() => {
    if (
      sourceFilter !== 'all' &&
      !uniqueSources.some((s) => s.title.toLowerCase() === sourceFilter.toLowerCase())
    ) {
      setSourceFilter('all');
    }
  }, [sourceFilter, uniqueSources]);

  const entryIdSet = useMemo(() => new Set(entries.map((e) => e.id)), [entries]);
  const validSelectedIds = useMemo(
    () => selectedIds.filter((id) => entryIdSet.has(id)),
    [selectedIds, entryIdSet]
  );
  const selectedIdSet = useMemo(() => new Set(validSelectedIds), [validSelectedIds]);

  const pdfFilteredCount = useMemo(() => {
    if (pdfCategory === 'all') return entries.length;
    return entries.filter((e) => e.category === pdfCategory).length;
  }, [entries, pdfCategory]);

  const notify = (text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone });
  };

  const visibleEntries = useMemo(
    () =>
      filterAndSortEntries(entries, {
        category: activeCategory,
        query: searchQuery,
        masteryFilter: statusFilter,
        sourceFilter,
        sortOrder,
      }),
    [entries, activeCategory, searchQuery, statusFilter, sourceFilter, sortOrder]
  );

  const allVisibleSelected =
    visibleEntries.length > 0 && visibleEntries.every((entry) => selectedIdSet.has(entry.id));

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    activeCategory !== 'all' ||
    statusFilter !== 'all' ||
    sourceFilter !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setStatusFilter('all');
    setSourceFilter('all');
  };

  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const clearUndoToast = () => {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoDeleteState(null);
  };

  const performDeleteWithUndo = (ids: string[]) => {
    if (ids.length === 0) return;
    const removed = onDeleteEntries(ids);
    if (removed.length === 0) return;

    const removedSet = new Set(ids);
    setSelectedIds((prev) => prev.filter((id) => !removedSet.has(id)));

    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
    }

    const label =
      removed.length === 1
        ? `Deleted "${removed[0].entry.expression}"`
        : `Deleted ${removed.length} entries`;

    setUndoDeleteState({
      items: removed,
      label,
      key: Date.now(),
    });

    undoTimerRef.current = window.setTimeout(() => {
      setUndoDeleteState(null);
      undoTimerRef.current = null;
    }, UNDO_TOAST_DURATION_MS);
  };

  const handleUndoDelete = () => {
    if (!undoDeleteState) return;
    const itemsToRestore = undoDeleteState.items;
    clearUndoToast();
    onRestoreEntries(itemsToRestore);
    notify(
      itemsToRestore.length === 1
        ? `Restored "${itemsToRestore[0].entry.expression}".`
        : `Restored ${itemsToRestore.length} entries.`,
      'ok'
    );
  };

  const toggleSelectEntry = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(visibleEntries.map((e) => e.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const merged = new Set(validSelectedIds);
      visibleEntries.forEach((e) => merged.add(e.id));
      setSelectedIds(Array.from(merged));
    }
  };

  const handleBulkMarkMastered = () => {
    if (validSelectedIds.length === 0) return;
    onBulkUpdateEntries(validSelectedIds, { masteryLevel: 'mastered' });
    notify(
      `Marked ${validSelectedIds.length} ${validSelectedIds.length === 1 ? 'entry' : 'entries'} as Mastered.`,
      'ok'
    );
    setSelectedIds([]);
  };

  const handleBulkMoveCategory = (targetCategory: Category) => {
    if (validSelectedIds.length === 0) return;
    onBulkUpdateEntries(validSelectedIds, { category: targetCategory });
    notify(
      `Moved ${validSelectedIds.length} ${validSelectedIds.length === 1 ? 'entry' : 'entries'} to ${CATEGORIES[targetCategory]}.`,
      'ok'
    );
    setSelectedIds([]);
  };

  const handleBulkExportPdf = () => {
    const subset = entries.filter((e) => selectedIdSet.has(e.id));
    if (subset.length === 0) return;
    try {
      const result = downloadStudySheetPdf(subset, {
        category: 'all',
        sortOrder: 'az',
        customLabel: `Selected Subset (${subset.length} ${subset.length === 1 ? 'entry' : 'entries'})`,
      });
      notify(
        `Downloaded PDF study sheet for ${result.entryCount} selected ${result.entryCount === 1 ? 'entry' : 'entries'}.`,
        'ok'
      );
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Could not generate PDF for selected entries.',
        'error'
      );
    }
  };

  const handleBulkExportAnki = () => {
    const subset = entries.filter((e) => selectedIdSet.has(e.id));
    if (subset.length === 0) return;
    const tsv = buildAnkiTsv(subset);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(
      `ipmat-cuet-anki-selected-${stamp}.tsv`,
      tsv,
      'text/tab-separated-values;charset=utf-8'
    );
    notify(
      `Exported ${subset.length} selected ${subset.length === 1 ? 'card' : 'cards'} to Anki (.tsv).`,
      'ok'
    );
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBulkBusy) return;
    const list = parseBulkInput(bulkText);
    if (list.length === 0) {
      setBulkFeedback({ summary: 'Enter at least one word, idiom, or phrasal verb.', details: [] });
      return;
    }

    setIsBulkBusy(true);
    let saved = 0;
    let skipped = 0;
    let failed = 0;
    const details: Array<{ text: string; isError: boolean }> = [];

    for (let i = 0; i < list.length; i++) {
      const expr = list[i];
      const cat = bulkCategory === 'auto' ? detectCategory(expr) : bulkCategory;
      setBulkFeedback({
        summary: list.length === 1 ? `Analysing "${expr}"…` : `Analysing ${i + 1} of ${list.length}: "${expr}"…`,
        details: [...details],
      });

      const outcome = await onSaveAndAnalyse({
        expression: expr,
        category: cat,
        contextSentence: '',
        sourceTitle: 'Manual entry',
        sourceUrl: '',
      });

      if (outcome.ok && outcome.entry) {
        saved++;
        const sheetNote = outcome.sheetSync?.synced
          ? ` · Added to Google Sheet (${outcome.sheetSync.tabName})`
          : outcome.sheetSync?.attempted && outcome.sheetSync.error
          ? ' · Sheet sync failed'
          : '';
        details.push({
          text: `Saved "${outcome.entry.expression}" to ${CATEGORIES[outcome.entry.category]}${sheetNote}.`,
          isError: false,
        });
      } else if (outcome.duplicate) {
        skipped++;
        details.push({ text: `Skipped duplicate: "${expr}".`, isError: false });
      } else {
        failed++;
        details.push({ text: `Failed "${expr}": ${outcome.error || 'Error'}`, isError: true });
      }
    }

    const parts: string[] = [];
    if (saved) parts.push(`${saved} saved`);
    if (skipped) parts.push(`${skipped} skipped (duplicate)`);
    if (failed) parts.push(`${failed} failed`);
    setBulkFeedback({ summary: `Completed: ${parts.join(', ')}.`, details });

    if (saved > 0 && failed === 0) setBulkText('');
    setIsBulkBusy(false);
  };

  const openEdit = (entry: VocabEntry) => {
    setEditingEntry(entry);
    setEditExpression(entry.expression);
    setEditCategory(entry.category);
    setEditMeaning(entry.meaning);
    setEditExample(entry.example);
    setEditError('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    if (!editExpression.trim() || !editMeaning.trim() || !editExample.trim()) {
      setEditError('Expression, meaning, and example sentence are required.');
      return;
    }
    const res = onUpdateEntry(editingEntry.id, {
      expression: editExpression.trim(),
      category: editCategory,
      meaning: editMeaning.trim(),
      example: editExample.trim(),
    });
    if (!res.ok) {
      setEditError(res.error || 'Could not update entry.');
      return;
    }
    setEditingEntry(null);
    notify(`Updated "${editExpression.trim()}".`, 'ok');
  };

  const handleReanalyse = async (entry: VocabEntry) => {
    setReanalysingId(entry.id);
    const res = await onReanalyseEntry(entry.id);
    setReanalysingId(null);
    if (res.ok) {
      notify(`Reanalysed "${entry.expression}" with Gemini.`, 'ok');
    } else {
      notify(res.error || `Could not reanalyse "${entry.expression}".`, 'error');
    }
  };

  const handleExportJson = () => {
    const backup = buildExportJson(entries);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(
      `ipmat-cuet-vocab-backup-${stamp}.json`,
      JSON.stringify(backup, null, 2),
      'application/json'
    );
    notify(`Exported ${entries.length} entries as JSON backup (API key excluded).`, 'ok');
  };

  const handleCopyJsonBackup = async () => {
    const backup = buildExportJson(entries);
    const payload = JSON.stringify(backup, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      notify(`Copied JSON backup (${entries.length} entries) to your clipboard.`, 'ok');
    } catch {
      notify('Could not copy automatically — use Export JSON Backup to download the file.', 'error');
    }
  };

  const handleImportJsonText = (rawText: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      notify('Could not import: input is not valid JSON.', 'error');
      return false;
    }
    const res = validateAndMergeImport(entries, parsed);
    if (!res.ok) {
      notify(res.error || 'Invalid backup file.', 'error');
      return false;
    }
    onMergeImported(res.mergedEntries);
    notify(
      `Imported ${res.addedCount} new ${res.addedCount === 1 ? 'entry' : 'entries'} (${res.skippedCount} existing skipped safely).`,
      'ok'
    );
    return true;
  };

  const handleExportCsv = () => {
    if (entries.length === 0) {
      notify('Your library is empty — add entries before downloading CSV.', 'error');
      return;
    }
    const csv = buildCsv(entries);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(`ipmat-cuet-vocab-${stamp}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
    notify(
      `Downloaded CSV with ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} (Word, Meaning, Example Sentence).`,
      'ok'
    );
  };

  const handleExportAnkiTsv = () => {
    if (entries.length === 0) {
      notify('Your library is empty — add entries before exporting for Anki.', 'error');
      return;
    }
    const tsv = buildAnkiTsv(entries);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(`ipmat-cuet-anki-${stamp}.tsv`, tsv, 'text/tab-separated-values;charset=utf-8');
    notify(
      `Exported ${entries.length} ${entries.length === 1 ? 'card' : 'cards'} to Anki (.tsv) with Meaning, Example & mastery tags.`,
      'ok'
    );
  };

  const openPdfExportModal = () => {
    setPdfCategory(activeCategory);
    setShowPdfModal(true);
  };

  const handleConfirmDownloadPdf = () => {
    try {
      const result = downloadStudySheetPdf(entries, {
        category: pdfCategory,
        sortOrder: pdfSortOrder,
      });
      setShowPdfModal(false);
      notify(
        `Downloaded PDF study sheet (${result.entryCount} ${result.entryCount === 1 ? 'entry' : 'entries'} in ${result.categoryLabel}).`,
        'ok'
      );
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Could not generate PDF study sheet.',
        'error'
      );
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      handleImportJsonText(text);
    } catch {
      notify('Could not read the selected file.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-[980px] mx-auto space-y-6">
      {/* Architectural Header Row */}
      <div className="flex flex-col gap-4 pb-5 border-b border-[#002962]/12 dark:border-[#93C5FD]/15">
        <div className="space-y-1">
          <h1 className="font-editorial text-[34px] sm:text-[38px] font-light tracking-[-0.03em] text-[#002962] dark:text-[#F1F5F9] leading-tight">
            THE VOCAB VAULT
            <span className="text-[#EA580C] font-semibold" aria-hidden="true">.</span>
          </h1>
          <p className="text-sm text-[#3B5578] dark:text-[#9FB3CE]">
            IPMAT &amp; CUET collections with spaced repetition, mistake tracking, plain meanings, and natural examples.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="study-mode-btn"
            aria-pressed={libraryMode === 'study'}
            onClick={() => {
              if (libraryMode === 'study') {
                setLibraryMode('list');
              } else {
                setStudyInitialScope(reviewQueue.totalDue > 0 ? 'dailyReview' : 'all');
                setLibraryMode('study');
              }
              setShowAddPanel(false);
              setShowBackupPanel(false);
            }}
            className={`h-9 px-4 inline-flex items-center gap-2 text-[13px] font-semibold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
              libraryMode === 'study'
                ? 'bg-[#002962] dark:bg-[#2563EB] text-white ring-2 ring-[#002962]/25 dark:ring-[#60A5FA]/40'
                : libraryMode === 'quiz'
                ? 'bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] hover:bg-[#EEF3F9] dark:hover:bg-[#172540]'
                : 'bg-[#002962] dark:bg-[#2563EB] text-white hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8]'
            }`}
          >
            <span>{libraryMode === 'study' ? 'Study Mode ✓' : 'Study Mode'}</span>
            {reviewQueue.totalDue > 0 && (
              <span
                data-testid="study-due-today-badge"
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded tabular-nums ${
                  libraryMode === 'quiz'
                    ? 'bg-[#FFF7ED] dark:bg-[#EA580C]/20 text-[#EA580C] dark:text-[#FB923C]'
                    : 'bg-[#EA580C] text-white'
                }`}
              >
                {reviewQueue.totalDue} Due Today
              </span>
            )}
          </button>
          <button
            type="button"
            data-testid="quiz-mode-btn"
            aria-pressed={libraryMode === 'quiz'}
            onClick={() => {
              setLibraryMode((m) => (m === 'quiz' ? 'list' : 'quiz'));
              setShowAddPanel(false);
              setShowBackupPanel(false);
            }}
            className={`h-9 px-4 text-[13px] font-semibold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
              libraryMode === 'quiz'
                ? 'bg-[#002962] dark:bg-[#2563EB] text-white ring-2 ring-[#002962]/25 dark:ring-[#60A5FA]/40'
                : 'bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] hover:bg-[#EEF3F9] dark:hover:bg-[#172540]'
            }`}
          >
            {libraryMode === 'quiz' ? 'Quiz Mode ✓' : 'Quiz Mode'}
          </button>
          <button
            type="button"
            aria-pressed={libraryMode === 'list' && showInsights}
            onClick={() => {
              if (libraryMode !== 'list') {
                setLibraryMode('list');
                setShowInsights(true);
              } else {
                setShowInsights((v) => !v);
              }
            }}
            className={`h-9 px-4 text-[13px] font-semibold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
              libraryMode === 'list' && showInsights
                ? 'bg-[#EEF3F9] dark:bg-[#1A2942] border border-[#002962]/30 dark:border-[#93C5FD]/30 text-[#002962] dark:text-[#E8EEF7]'
                : 'bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540]'
            }`}
          >
            {libraryMode === 'list' && showInsights ? 'Hide Insights' : 'Insights'}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-4 text-[13px] font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#F5F3F0] dark:hover:bg-[#172540] whitespace-nowrap cursor-pointer transition-colors"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={openPdfExportModal}
            className="h-9 px-4 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#F5F3F0] dark:hover:bg-[#172540] whitespace-nowrap cursor-pointer transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-[#002962] dark:text-[#93C5FD]" aria-hidden="true" />
            Download as PDF
          </button>
          <button
            type="button"
            data-testid="add-entries-btn"
            aria-pressed={showAddPanel}
            onClick={() => {
              setLibraryMode('list');
              setShowAddPanel((v) => !v);
              setShowBackupPanel(false);
            }}
            className={`h-9 px-4 text-[13px] font-semibold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
              showAddPanel
                ? 'bg-[#EEF3F9] dark:bg-[#1A2942] border border-[#002962]/35 dark:border-[#60A5FA]/50 text-[#002962] dark:text-white ring-2 ring-[#002962]/15 dark:ring-[#60A5FA]/25'
                : 'bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540]'
            }`}
          >
            {showAddPanel ? 'Add Entries ✓' : 'Add Entries'}
          </button>
          <button
            type="button"
            data-testid="backup-export-btn"
            aria-pressed={showBackupPanel}
            onClick={() => {
              setLibraryMode('list');
              setShowBackupPanel((v) => !v);
              setShowAddPanel(false);
            }}
            className={`h-9 px-4 text-[13px] font-semibold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
              showBackupPanel
                ? 'bg-[#EEF3F9] dark:bg-[#1A2942] border border-[#002962]/35 dark:border-[#60A5FA]/50 text-[#002962] dark:text-white ring-2 ring-[#002962]/15 dark:ring-[#60A5FA]/25'
                : 'bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540]'
            }`}
          >
            {showBackupPanel ? 'Backup & Export ✓' : 'Backup & Export'}
          </button>
        </div>
      </div>

      {/* Toast Feedback — immediately visible right below top action bar */}
      {toast && (
        <div
          role="status"
          data-testid="library-toast"
          className={`flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border text-[13.5px] ${
            toast.tone === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200'
              : 'bg-[#EEF3F9] dark:bg-[#172540] border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7]'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Collapsible Manual & Bulk Entry — opens immediately below top buttons */}
      {showAddPanel && (
        <section
          data-testid="add-entries-panel"
          className="nesoi-card p-5 space-y-3 border-l-4 border-l-[#002962] dark:border-l-[#3B82F6]"
          aria-label="Manual and bulk entry"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-lg font-semibold text-[#002962] dark:text-[#F1F5F9]">
              Manual &amp; Bulk Entry
            </h2>
            <button
              type="button"
              onClick={() => setShowAddPanel(false)}
              className="text-xs font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <form onSubmit={handleBulkSubmit} className="space-y-3" noValidate>
            <label htmlFor="lib-bulk-input" className="block text-[13px] font-medium text-[#002962] dark:text-[#DCE8FA]">
              Enter one expression or multiple separated by commas or new lines
            </label>
            <textarea
              id="lib-bulk-input"
              rows={3}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'aberration, meticulous, pragmatic\nBreak the ice\nCome across'}
              className="w-full px-3 py-2 text-sm border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] placeholder:text-[#5E7494] dark:placeholder:text-[#7C95B6] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="lib-bulk-cat" className="text-[13px] font-medium text-[#3B5578] dark:text-[#9FB3CE]">
                  Category
                </label>
                <select
                  id="lib-bulk-cat"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as 'auto' | Category)}
                  className="h-9 px-3 text-[13px] border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7]"
                >
                  <option value="auto">Auto-detect</option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="idioms">Idioms</option>
                  <option value="phrasalVerbs">Phrasal Verbs</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isBulkBusy}
                className="h-9 px-5 text-[13px] font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-60 cursor-pointer"
              >
                {isBulkBusy ? 'Analysing…' : 'Save and Analyse'}
              </button>
            </div>
            {bulkFeedback && (
              <div className="p-3 bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/12 dark:border-[#93C5FD]/15 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-[#002962] dark:text-white">{bulkFeedback.summary}</p>
                {bulkFeedback.details.length > 0 && (
                  <ul className="pl-4 list-disc space-y-0.5">
                    {bulkFeedback.details.map((d, i) => (
                      <li
                        key={i}
                        className={
                          d.isError
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-[#3B5578] dark:text-[#9FB3CE]'
                        }
                      >
                        {d.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>
        </section>
      )}

      {/* Collapsible Backup & Export Panel — opens immediately below top buttons */}
      {showBackupPanel && (
        <section
          data-testid="backup-export-panel"
          className="nesoi-card p-5 space-y-3.5 border-l-4 border-l-[#EA580C]"
          aria-label="Backup and export"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-lg font-semibold text-[#002962] dark:text-[#F1F5F9]">
              Local Storage, Backup &amp; Export
            </h2>
            <button
              type="button"
              onClick={() => setShowBackupPanel(false)}
              className="text-xs font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-[13.5px] text-[#3B5578] dark:text-[#9FB3CE] max-w-[74ch]">
            All {entries.length} {entries.length === 1 ? 'entry is' : 'entries are'} stored locally in your browser. Export a JSON backup periodically (your Gemini API key is never included), import backups safely without overwriting existing entries, or export study sheets for CSV, Anki, and PDF.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              data-testid="export-json-btn"
              onClick={handleExportJson}
              className="h-9 px-4 text-[13px] font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer transition-colors"
            >
              Export JSON Backup
            </button>
            <button
              type="button"
              data-testid="copy-json-btn"
              onClick={handleCopyJsonBackup}
              className="h-9 px-4 text-[13px] font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] cursor-pointer transition-colors"
            >
              Copy JSON
            </button>
            <button
              type="button"
              data-testid="import-json-btn"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
              className="h-9 px-4 text-[13px] font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer transition-colors"
            >
              Import JSON File
            </button>
            <button
              type="button"
              data-testid="toggle-paste-import-btn"
              aria-pressed={showPasteImport}
              onClick={() => setShowPasteImport((v) => !v)}
              className="h-9 px-4 text-[13px] font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer transition-colors"
            >
              {showPasteImport ? 'Hide Paste JSON' : 'Paste JSON'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              data-testid="backup-export-csv-btn"
              onClick={handleExportCsv}
              className="h-9 px-4 text-[13px] font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer transition-colors"
            >
              Download CSV
            </button>
            <button
              type="button"
              data-testid="backup-export-anki-btn"
              onClick={handleExportAnkiTsv}
              className="h-9 px-4 text-[13px] font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer transition-colors"
            >
              Export Anki (.tsv)
            </button>
            <button
              type="button"
              data-testid="backup-export-pdf-btn"
              onClick={openPdfExportModal}
              className="h-9 px-4 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] cursor-pointer transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
              Download PDF Sheet
            </button>
            <button
              type="button"
              data-testid="clear-library-btn"
              onClick={() => {
                if (entries.length === 0) {
                  notify('Your library is already empty.', 'ok');
                  return;
                }
                setConfirmState({
                  title: 'Clear Entire Library',
                  message: `Permanently delete all ${entries.length} saved entries from local storage? Export a JSON backup first if you want a copy.`,
                  confirmLabel: 'Clear Library',
                  onConfirm: () => {
                    onClearAll();
                    setSelectedIds([]);
                    notify('Library cleared.', 'ok');
                  },
                });
              }}
              className="h-9 px-4 text-[13px] font-semibold bg-white dark:bg-[#111C30] border border-red-200 dark:border-red-800/60 rounded-md text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
            >
              Clear Library
            </button>
          </div>

          {showPasteImport && (
            <div className="pt-2 border-t border-[#002962]/10 dark:border-[#93C5FD]/12 space-y-2">
              <label
                htmlFor="paste-json-backup-input"
                className="block text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]"
              >
                Paste exported JSON backup below to merge safely into your library:
              </label>
              <textarea
                id="paste-json-backup-input"
                data-testid="paste-json-textarea"
                rows={4}
                value={pasteImportText}
                onChange={(e) => setPasteImportText(e.target.value)}
                placeholder='{"app":"IPMAT/CUET VOCAB BUILDER","entries":[...]}'
                className="w-full px-3 py-2 text-xs font-code border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] placeholder:text-[#5E7494] dark:placeholder:text-[#7C95B6] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasteImportText('');
                    setShowPasteImport(false);
                  }}
                  className="h-8 px-3 text-xs font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#3B5578] dark:text-[#9FB3CE] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-paste-import-btn"
                  onClick={() => {
                    if (!pasteImportText.trim()) {
                      notify('Paste a JSON backup before importing.', 'error');
                      return;
                    }
                    const ok = handleImportJsonText(pasteImportText);
                    if (ok) {
                      setPasteImportText('');
                      setShowPasteImport(false);
                    }
                  }}
                  className="h-8 px-4 text-xs font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer"
                >
                  Import Pasted JSON
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Top Real-Time Search & Filter Bar (always at top of My CUET Library in list mode) */}
      {libraryMode === 'list' && (
        <section
          aria-label="Search and filter saved vocabulary"
          data-testid="library-top-search-bar"
          className="nesoi-card p-3.5 sm:p-4 space-y-2.5"
        >
          <div className="flex flex-col gap-2.5">
            <div className="relative w-full">
              <Search
                className="w-4 h-4 text-[#5E7494] dark:text-[#7C95B6] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="library-search" className="sr-only">
                Search library by word, meaning, or source title
              </label>
              <input
                ref={searchInputRef}
                id="library-search"
                data-testid="library-search-input"
                type="text"
                role="searchbox"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && searchQuery) {
                    e.stopPropagation();
                    setSearchQuery('');
                  }
                }}
                placeholder="Search by word, meaning, or source title…"
                className={`w-full h-10 pl-10 ${searchQuery ? 'pr-16' : 'pr-3.5'} text-sm border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] placeholder:text-[#5E7494] dark:placeholder:text-[#7C95B6] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-[#002962]/10 dark:focus:ring-[#60A5FA]/20`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white px-1.5 py-0.5 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <label htmlFor="library-category-filter" className="sr-only">
                Filter by category
              </label>
              <select
                id="library-category-filter"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value as 'all' | Category)}
                className="h-10 px-3 text-[13px] font-medium border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              >
                <option value="all">All Categories</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="idioms">Idioms</option>
                <option value="phrasalVerbs">Phrasal Verbs</option>
              </select>

              <label htmlFor="library-filter" className="sr-only">
                Filter by mastery level or revision queue
              </label>
              <select
                id="library-filter"
                data-testid="library-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LibraryMasteryFilter)}
                className="h-10 px-3 text-[13px] font-medium border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              >
                <option value="all">All Levels</option>
                <option value="dueToday">Due Today ({reviewQueue.totalDue})</option>
                <option value="needsPractice">Needs Practice ({needsPracticeCount})</option>
                <option value="new">New</option>
                <option value="learning">Learning</option>
                <option value="mastered">Mastered</option>
                <option value="favourites">Favourites</option>
              </select>

              <label htmlFor="library-source-filter" className="sr-only">
                Filter by reading source
              </label>
              <select
                id="library-source-filter"
                data-testid="library-source-filter"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-10 max-w-[210px] px-3 text-[13px] font-medium border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              >
                <option value="all">All Sources ({uniqueSources.length})</option>
                {uniqueSources.map((src) => (
                  <option key={src.title} value={src.title}>
                    {src.title} ({src.count})
                  </option>
                ))}
              </select>

              <label htmlFor="library-sort" className="sr-only">
                Sort order
              </label>
              <select
                id="library-sort"
                data-testid="library-sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as LibrarySortOrder)}
                className="h-10 px-3 text-[13px] font-medium border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              >
                <option value="recent">Recently added</option>
                <option value="mostMissed">Most missed</option>
                <option value="az">Alphabetical (A–Z)</option>
                <option value="za">Alphabetical (Z–A)</option>
              </select>
            </div>
          </div>

          {/* Quick Revision Filters Row (Due Today + Needs Practice) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#002962]/8 dark:border-[#93C5FD]/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] font-semibold text-[#5E7494] dark:text-[#7C95B6] uppercase tracking-[0.06em]">
                Quick Filters:
              </span>
              <button
                type="button"
                data-testid="quick-filter-due-today"
                aria-pressed={statusFilter === 'dueToday'}
                onClick={() =>
                  setStatusFilter((prev) => (prev === 'dueToday' ? 'all' : 'dueToday'))
                }
                className={`h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer tabular-nums ${
                  statusFilter === 'dueToday'
                    ? 'bg-[#002962] dark:bg-[#2563EB] border-[#002962] dark:border-[#2563EB] text-white'
                    : 'bg-[#F5F3F0] dark:bg-[#172540] border-[#002962]/15 dark:border-[#93C5FD]/20 text-[#002962] dark:text-[#DCE8FA] hover:bg-[#EEF3F9] dark:hover:bg-[#1E3154]'
                }`}
              >
                <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Due Today</span>
                <span className={statusFilter === 'dueToday' ? 'text-[#93C5FD]' : 'text-[#EA580C] dark:text-[#FB923C]'}>
                  {reviewQueue.totalDue}
                </span>
              </button>
              <button
                type="button"
                data-testid="quick-filter-needs-practice"
                aria-pressed={statusFilter === 'needsPractice'}
                onClick={() =>
                  setStatusFilter((prev) => (prev === 'needsPractice' ? 'all' : 'needsPractice'))
                }
                className={`h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer tabular-nums ${
                  statusFilter === 'needsPractice'
                    ? 'bg-[#EA580C] border-[#EA580C] text-white'
                    : 'bg-[#F5F3F0] dark:bg-[#172540] border-[#002962]/15 dark:border-[#93C5FD]/20 text-[#002962] dark:text-[#DCE8FA] hover:bg-[#FFF7ED] dark:hover:bg-[#EA580C]/20'
                }`}
              >
                <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Needs Practice</span>
                <span className={statusFilter === 'needsPractice' ? 'text-white/90' : 'text-[#EA580C] dark:text-[#FB923C]'}>
                  {needsPracticeCount}
                </span>
              </button>
              {sourceFilter !== 'all' && (
                <button
                  type="button"
                  data-testid="active-source-filter-chip"
                  onClick={() => setSourceFilter('all')}
                  className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md bg-[#EEF3F9] dark:bg-[#1A2942] border border-[#002962]/25 dark:border-[#60A5FA]/35 text-xs font-semibold text-[#002962] dark:text-[#DCE8FA] cursor-pointer max-w-[260px]"
                  title="Click to clear source filter"
                >
                  <Filter className="w-3 h-3 shrink-0 text-[#EA580C]" aria-hidden="true" />
                  <span className="truncate">Source: {sourceFilter}</span>
                  <X className="w-3 h-3 shrink-0" aria-hidden="true" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-3 text-xs text-[#3B5578] dark:text-[#9FB3CE] tabular-nums">
                <p data-testid="library-filter-summary">
                  Showing <strong className="font-semibold text-[#002962] dark:text-white">{visibleEntries.length}</strong> of{' '}
                  {entries.length}
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="font-semibold text-[#002962] dark:text-[#93C5FD] hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Custom Exam Countdown & Revision Pace Bar */}
      {(!searchQuery.trim() || libraryMode !== 'list') && (
        <ExamCountdownBar
          config={examConfig}
          entries={entries}
          onSaveConfig={onUpdateExamConfig}
        />
      )}

      {/* Google Sheets Auto-Save Bar (shown below search results when actively searching, otherwise here) */}
      {libraryMode === 'list' && !searchQuery.trim() && (
        <GoogleSheetsBar sheets={sheets} onOpenInstallGuide={onOpenInstallGuide} />
      )}

      {/* (Toast, Add Entries, and Backup & Export panels are rendered immediately below the top action bar) */}

      {/* Overview Sections (Mastery Progress, Badges & Insights) — tucked below live search results while typing */}
      {(!searchQuery.trim() || libraryMode !== 'list') && (
        <>
          {/* Mastery Progress Bar */}
          <section
            aria-label="Mastery progress"
            className="nesoi-card px-5 py-4 space-y-2.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="font-editorial text-[17px] font-semibold text-[#002962] dark:text-[#F1F5F9]">
                  Mastery Progress
                </h2>
                <span className="text-xs text-[#3B5578] dark:text-[#9FB3CE] tabular-nums" data-testid="mastery-summary-counts">
                  {masteryStats.masteredCount} mastered · {masteryStats.learningCount} learning · {masteryStats.newCount} new
                </span>
              </div>
              <span
                className="text-sm font-bold text-[#002962] dark:text-[#F1F5F9] tabular-nums"
                data-testid="mastery-percent"
              >
                {masteryStats.percentMastered}% Mastered
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Vocabulary mastery progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={masteryStats.percentMastered}
              className="h-2 w-full bg-[#EAE7E1] dark:bg-[#1E2E47] rounded-full overflow-hidden flex"
            >
              <div
                className="h-full bg-[#002962] dark:bg-[#3B82F6] transition-all duration-300"
                style={{ width: `${masteryStats.percentMastered}%` }}
                title={`Mastered: ${masteryStats.masteredCount}`}
              />
              <div
                className="h-full bg-[#EA580C] dark:bg-[#FB923C] transition-all duration-300"
                style={{ width: `${masteryStats.percentLearning}%` }}
                title={`Learning: ${masteryStats.learningCount}`}
              />
            </div>
          </section>

          {/* Unlockable Mastery Badges */}
          <MasteryBadgesPanel entries={entries} />

          {/* Insights Recharts Bar Charts (Words Learned per Category + Mastery Distribution) */}
          {libraryMode === 'list' && showInsights && <LibraryInsightsPanel entries={entries} />}
        </>
      )}

      {libraryMode === 'study' ? (
        <StudyModePanel
          entries={entries}
          initialScope={studyInitialScope}
          onRateEntry={(id: string, outcome: StudyOutcome) => {
            if (outcome === 'needsReview') {
              onRecordEntryMiss(id);
            } else {
              const nextLevel = getStudyMasteryForOutcome(outcome);
              onUpdateEntry(id, {
                masteryLevel: nextLevel,
                learned: nextLevel === 'mastered',
              });
            }
          }}
          onExit={() => setLibraryMode('list')}
        />
      ) : libraryMode === 'quiz' ? (
        <QuizModePanel
          entries={entries}
          onRecordQuizMiss={onRecordEntryMiss}
          onMarkEntriesMastered={(ids) => {
            onBulkUpdateEntries(ids, { masteryLevel: 'mastered' });
            notify(
              `Marked ${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} as Mastered.`,
              'ok'
            );
          }}
          onExit={() => setLibraryMode('list')}
        />
      ) : (
        <>
          {/* Category Segmented Tabs + Select All Visible */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
            <div className="overflow-x-auto max-w-full">
              <div
                role="tablist"
                aria-label="Vocabulary collections"
                className="inline-flex items-center p-1 rounded-lg bg-[#EAE7E1] dark:bg-[#111C30] border border-[#002962]/12 dark:border-[#93C5FD]/15"
              >
                {(
                  [
                    { id: 'all', label: 'All Categories', count: counts.total },
                    { id: 'vocabulary', label: 'Vocabulary', count: counts.vocabulary },
                    { id: 'idioms', label: 'Idioms', count: counts.idioms },
                    { id: 'phrasalVerbs', label: 'Phrasal Verbs', count: counts.phrasalVerbs },
                  ] as const
                ).map((tab) => {
                  const active = activeCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveCategory(tab.id)}
                      className={`px-4 py-1.5 rounded-md text-[13.5px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#002962] dark:bg-[#2563EB] text-white shadow-sm'
                          : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
                      }`}
                    >
                      {tab.label}{' '}
                      <span
                        className={`ml-1 text-[12px] font-semibold tabular-nums ${
                          active ? 'text-[#93C5FD]' : 'text-[#5E7494] dark:text-[#7C95B6]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {visibleEntries.length > 0 && (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white cursor-pointer select-none px-2 py-1">
                <input
                  type="checkbox"
                  data-testid="select-all-visible-checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded accent-[#002962] dark:accent-[#3B82F6] cursor-pointer"
                />
                <span className="tabular-nums">
                  Select all visible ({visibleEntries.length})
                </span>
              </label>
            )}
          </div>

          {/* Bulk Multi-Select Action Bar */}
          {validSelectedIds.length > 0 && (
            <div
              data-testid="bulk-action-bar"
              role="region"
              aria-label="Bulk actions for selected entries"
              className="rounded-xl border border-[#002962]/25 dark:border-[#60A5FA]/35 bg-[#EEF3F9] dark:bg-[#172540] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-bold text-[#002962] dark:text-white tabular-nums">
                  {validSelectedIds.length} selected
                </span>
                <button
                  type="button"
                  data-testid="bulk-clear-selection-btn"
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white underline cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="bulk-mark-mastered-btn"
                  onClick={handleBulkMarkMastered}
                  className="h-8 px-3 text-xs font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer whitespace-nowrap"
                >
                  Mark Mastered
                </button>

                <label htmlFor="bulk-move-category" className="sr-only">
                  Move selected entries to category
                </label>
                <select
                  id="bulk-move-category"
                  data-testid="bulk-move-category-select"
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value as Category | '';
                    if (val) {
                      handleBulkMoveCategory(val);
                      e.target.value = '';
                    }
                  }}
                  className="h-8 px-2.5 text-xs font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] cursor-pointer"
                >
                  <option value="" disabled>
                    Move to…
                  </option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="idioms">Idioms</option>
                  <option value="phrasalVerbs">Phrasal Verbs</option>
                </select>

                <button
                  type="button"
                  data-testid="bulk-export-pdf-btn"
                  onClick={handleBulkExportPdf}
                  className="h-8 px-3 inline-flex items-center gap-1 text-xs font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#F5F3F0] dark:hover:bg-[#1E3154] cursor-pointer whitespace-nowrap"
                >
                  <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                  Export PDF
                </button>

                <button
                  type="button"
                  data-testid="bulk-export-anki-btn"
                  onClick={handleBulkExportAnki}
                  className="h-8 px-3 text-xs font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#F5F3F0] dark:hover:bg-[#1E3154] cursor-pointer whitespace-nowrap"
                >
                  Export Anki (.tsv)
                </button>

                <button
                  type="button"
                  data-testid="bulk-delete-btn"
                  onClick={() => performDeleteWithUndo(validSelectedIds)}
                  className="h-8 px-3 inline-flex items-center gap-1 text-xs font-semibold bg-white dark:bg-[#111C30] border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Entries List */}
          <div className="nesoi-card divide-y divide-[#002962]/10 dark:divide-[#93C5FD]/12 overflow-hidden">
            {visibleEntries.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <p className="font-editorial text-lg font-semibold text-[#002962] dark:text-[#F1F5F9]">
                  {hasActiveFilters ? 'No matching entries' : 'No entries saved yet'}
                </p>
                <p className="mt-1 text-sm text-[#3B5578] dark:text-[#9FB3CE]">
                  {hasActiveFilters
                    ? 'Clear your keyword or adjust the category, source, and mastery filters above.'
                    : 'Select text in Live Preview or click "Add Entries" above to start building your vocabulary.'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="mt-3 h-9 px-4 text-xs font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              visibleEntries.map((entry) => {
                const mastery = getMasteryLevel(entry);
                const missCount = getMissCount(entry);
                const reviewSchedule = getEntryReviewSchedule(entry);
                const isSelected = selectedIdSet.has(entry.id);

                return (
                  <article
                    key={entry.id}
                    data-testid={`vocab-entry-card-${entry.id}`}
                    className={`px-5 sm:px-6 py-5 transition-colors ${
                      isSelected
                        ? 'bg-[#EEF3F9]/70 dark:bg-[#172540]/85'
                        : mastery === 'mastered'
                        ? 'bg-[#F8FAFC] dark:bg-[#0E182B]'
                        : 'bg-white dark:bg-[#111C30]'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectEntry(entry.id)}
                          aria-label={`Select ${entry.expression}`}
                          data-testid={`select-entry-${entry.id}`}
                          className="h-4 w-4 rounded accent-[#002962] dark:accent-[#3B82F6] cursor-pointer shrink-0"
                        />
                        <h3 className="text-[19px] font-bold tracking-[-0.02em] text-[#002962] dark:text-[#F1F5F9]">
                          {entry.expression}
                        </h3>
                        {canSpeakExpression() && (
                          <button
                            type="button"
                            onClick={() => speakExpression(entry.expression)}
                            aria-label={`Pronounce ${entry.expression}`}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11.5px] font-semibold bg-[#EEF3F9] dark:bg-[#1A2942] border border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#DCE8FA] rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#23375A] transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" aria-hidden="true" />
                            Listen
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#3B5578] dark:text-[#9FB3CE] tabular-nums">
                        {activeCategory === 'all' && (
                          <>
                            <span className="font-semibold text-[#002962] dark:text-[#E8EEF7]">
                              {CATEGORIES[entry.category]}
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span>{formatDate(entry.dateAdded)}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            mastery === 'mastered'
                              ? 'text-[#002962] dark:text-[#60A5FA] font-bold'
                              : mastery === 'learning'
                              ? 'text-[#EA580C] dark:text-[#FB923C] font-semibold'
                              : 'text-[#3B5578] dark:text-[#9FB3CE] font-medium'
                          }
                        >
                          {MASTERY_LABELS[mastery]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            reviewSchedule.isDueToday
                              ? 'text-[#EA580C] dark:text-[#FB923C] font-semibold'
                              : 'text-[#5E7494] dark:text-[#7C95B6]'
                          }
                        >
                          {reviewSchedule.scheduleLabel}
                        </span>
                        {missCount > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              data-testid={`entry-miss-count-${entry.id}`}
                              className="text-[#EA580C] dark:text-[#FB923C] font-semibold"
                            >
                              Missed {missCount}×
                            </span>
                          </>
                        )}
                        {entry.favourite && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#EA580C] dark:text-[#FB923C] font-semibold">
                              Favourite
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pl-6.5 space-y-1.5 text-[15px] text-[#1A3459] dark:text-[#CBD5E1] max-w-[70ch]">
                      <p>
                        <strong className="font-semibold text-[#002962] dark:text-[#F1F5F9]">
                          Meaning:
                        </strong>{' '}
                        {entry.meaning}
                      </p>
                      <p>
                        <strong className="font-semibold text-[#002962] dark:text-[#F1F5F9]">
                          Example:
                        </strong>{' '}
                        {entry.example}
                      </p>
                      {entry.sourceTitle && (
                        <p
                          className="text-[12.5px] text-[#3B5578] dark:text-[#9FB3CE] pt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1"
                          data-testid="entry-source-title"
                        >
                          <span>
                            <span className="font-semibold text-[#002962]/80 dark:text-[#DCE8FA]/90">
                              Source:
                            </span>{' '}
                            {/^https?:\/\//i.test(entry.sourceUrl || '') ? (
                              <a
                                href={entry.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#002962] dark:hover:text-white underline underline-offset-2 decoration-[#002962]/25 dark:decoration-[#93C5FD]/30 hover:decoration-[#002962]"
                              >
                                {entry.sourceTitle}
                              </a>
                            ) : (
                              <span>{entry.sourceTitle}</span>
                            )}
                          </span>
                          <button
                            type="button"
                            data-testid="card-filter-source-btn"
                            onClick={() => setSourceFilter(entry.sourceTitle)}
                            className="text-[11.5px] font-semibold text-[#002962] dark:text-[#93C5FD] hover:text-[#EA580C] dark:hover:text-[#FB923C] hover:underline cursor-pointer"
                          >
                            Filter by source
                          </button>
                        </p>
                      )}
                    </div>

                    <div className="pl-6.5 mt-3.5 flex flex-wrap items-center justify-between gap-3">
                      {/* Mastery Level 3-State Segmented Toggle */}
                      <div
                        role="group"
                        aria-label={`Mastery level for ${entry.expression}`}
                        className="inline-flex items-center p-0.5 rounded-md bg-[#EAE7E1] dark:bg-[#0D1626] border border-[#002962]/12 dark:border-[#93C5FD]/15"
                      >
                        {VALID_MASTERY_LEVELS.map((level) => {
                          const active = mastery === level;
                          const activeClasses =
                            level === 'mastered'
                              ? 'bg-[#002962] dark:bg-[#2563EB] text-white font-semibold shadow-sm'
                              : level === 'learning'
                              ? 'bg-[#EA580C] text-white font-semibold shadow-sm'
                              : 'bg-white dark:bg-[#1E3154] text-[#002962] dark:text-white font-semibold shadow-sm';
                          return (
                            <button
                              key={level}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                onUpdateEntry(entry.id, {
                                  masteryLevel: level,
                                  learned: level === 'mastered',
                                })
                              }
                              className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap cursor-pointer ${
                                active
                                  ? activeClasses
                                  : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
                              }`}
                            >
                              {MASTERY_LABELS[level]}
                            </button>
                          );
                        })}
                      </div>

                      {/* Secondary Entry Actions */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(formatEntryCopyText(entry));
                              setCopiedId(entry.id);
                              setTimeout(() => {
                                setCopiedId((prev) => (prev === entry.id ? null : prev));
                              }, 1500);
                            } catch {
                              notify('Clipboard permission blocked in this browser.', 'error');
                            }
                          }}
                          aria-label={`Copy ${entry.expression}`}
                          className="inline-flex items-center gap-1 font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white hover:underline cursor-pointer"
                        >
                          {copiedId === entry.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#002962] dark:text-[#60A5FA]" aria-hidden="true" />
                              <span className="text-[#002962] dark:text-[#60A5FA]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateEntry(entry.id, { favourite: !entry.favourite })}
                          className={`font-semibold hover:underline cursor-pointer ${
                            entry.favourite
                              ? 'text-[#EA580C] dark:text-[#FB923C]'
                              : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
                          }`}
                        >
                          {entry.favourite ? 'Remove Favourite' : 'Favourite'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(entry)}
                          aria-label={`Edit ${entry.expression}`}
                          className="font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={reanalysingId === entry.id}
                          onClick={() => handleReanalyse(entry)}
                          aria-label={`Reanalyse ${entry.expression}`}
                          className="font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {reanalysingId === entry.id ? 'Reanalysing…' : 'Reanalyse'}
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${entry.expression}`}
                          onClick={() => performDeleteWithUndo([entry.id])}
                          className="font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-red-700 dark:hover:text-red-400 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}

      {/* 5-Second Floating Undo Toast on Delete */}
      {undoDeleteState && (
        <div
          key={undoDeleteState.key}
          role="status"
          aria-live="polite"
          data-testid="undo-delete-toast"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[min(420px,calc(100vw-2rem))] rounded-xl bg-[#002962] dark:bg-[#172540] text-white border border-white/15 dark:border-[#93C5FD]/25 shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-[13.5px] font-medium truncate">
              {undoDeleteState.label}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="undo-delete-btn"
                onClick={handleUndoDelete}
                className="h-7 px-3 inline-flex items-center gap-1.5 text-xs font-bold bg-[#EA580C] hover:bg-[#DC4E07] text-white rounded-md cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Undo
              </button>
              <button
                type="button"
                onClick={clearUndoToast}
                aria-label="Dismiss delete notification"
                className="p-1 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="h-1 w-full bg-white/15">
            <div className="h-full bg-[#EA580C] undo-progress-bar" />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <div
          className="fixed inset-0 z-50 bg-[#002962]/45 dark:bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingEntry(null);
          }}
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-[500px] bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/20 rounded-xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="edit-modal-title" className="font-editorial text-xl font-semibold text-[#002962] dark:text-[#F1F5F9]">
                Edit Entry
              </h2>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-sm font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-expr-input" className="block text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]">
                Expression
              </label>
              <input
                id="edit-expr-input"
                type="text"
                value={editExpression}
                onChange={(e) => setEditExpression(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-cat-select" className="block text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]">
                Collection
              </label>
              <select
                id="edit-cat-select"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as Category)}
                className="w-full h-10 px-3 text-sm border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              >
                <option value="vocabulary">Vocabulary</option>
                <option value="idioms">Idioms</option>
                <option value="phrasalVerbs">Phrasal Verbs</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-meaning-input" className="block text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]">
                Meaning
              </label>
              <textarea
                id="edit-meaning-input"
                rows={3}
                value={editMeaning}
                onChange={(e) => setEditMeaning(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-example-input" className="block text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]">
                Example Sentence
              </label>
              <textarea
                id="edit-example-input"
                rows={2}
                value={editExample}
                onChange={(e) => setEditExample(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              />
            </div>

            {editError && <p className="text-xs text-red-700 dark:text-red-300">{editError}</p>}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="h-9 px-4 text-sm font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-5 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Clear Library Modal */}
      {confirmState && (
        <div
          className="fixed inset-0 z-50 bg-[#002962]/45 dark:bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmState(null);
          }}
        >
          <div className="w-full max-w-[420px] bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/20 rounded-xl shadow-xl p-6 space-y-4">
            <h2 id="confirm-modal-title" className="font-editorial text-xl font-semibold text-[#002962] dark:text-[#F1F5F9]">
              {confirmState.title}
            </h2>
            <p className="text-sm text-[#3B5578] dark:text-[#9FB3CE]">{confirmState.message}</p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="h-9 px-4 text-sm font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = confirmState.onConfirm;
                  setConfirmState(null);
                  fn();
                }}
                className="h-9 px-5 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Printable PDF Study Sheet Modal */}
      {showPdfModal && (
        <div
          className="fixed inset-0 z-50 bg-[#002962]/45 dark:bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-export-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowPdfModal(false);
          }}
        >
          <div className="w-full max-w-[480px] bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/20 rounded-xl shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="pdf-export-modal-title" className="font-editorial text-xl font-semibold text-[#002962] dark:text-[#F1F5F9]">
                  Download Printable Study Sheet (PDF)
                </h2>
                <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] mt-1">
                  Generate an A4 printable study sheet with expression, meaning, example sentence, and mastery level.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                aria-label="Close PDF export dialog"
                className="text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white text-lg leading-none px-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]">Filter by category</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="PDF category filter">
                {(
                  [
                    { id: 'all', label: 'All Categories', count: counts.total },
                    { id: 'vocabulary', label: 'Words (Vocabulary)', count: counts.vocabulary },
                    { id: 'idioms', label: 'Idioms', count: counts.idioms },
                    { id: 'phrasalVerbs', label: 'Phrasal Verbs', count: counts.phrasalVerbs },
                  ] as const
                ).map((opt) => {
                  const selected = pdfCategory === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPdfCategory(opt.id)}
                      className={`px-3.5 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#EEF3F9] dark:bg-[#1A2942] border-[#002962] dark:border-[#60A5FA] text-[#002962] dark:text-white'
                          : 'bg-white dark:bg-[#0D1626] border-[#002962]/15 dark:border-[#93C5FD]/18 text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540]'
                      }`}
                    >
                      <div className="text-[13px] font-semibold">{opt.label}</div>
                      <div className="text-[11.5px] text-[#3B5578] dark:text-[#9FB3CE] tabular-nums mt-0.5">
                        {opt.count} {opt.count === 1 ? 'entry' : 'entries'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pdf-sort-order" className="block text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]">
                Order in study sheet
              </label>
              <select
                id="pdf-sort-order"
                value={pdfSortOrder}
                onChange={(e) => setPdfSortOrder(e.target.value as PdfSortOrder)}
                className="w-full h-10 px-3 text-sm border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              >
                <option value="az">Alphabetical (A–Z) — best for revision</option>
                <option value="recent">Recently added first</option>
                <option value="za">Reverse alphabetical (Z–A)</option>
              </select>
            </div>

            <div className="rounded-lg bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/12 dark:border-[#93C5FD]/15 px-3.5 py-2.5 text-xs text-[#3B5578] dark:text-[#9FB3CE]">
              {pdfFilteredCount > 0 ? (
                <>
                  Ready to generate <strong className="text-[#002962] dark:text-white">{getPdfCategoryLabel(pdfCategory)}</strong> with{' '}
                  <strong className="tabular-nums text-[#002962] dark:text-white">{pdfFilteredCount}</strong>{' '}
                  {pdfFilteredCount === 1 ? 'entry' : 'entries'}.
                </>
              ) : (
                <span className="text-red-700 dark:text-red-300 font-medium">
                  No saved entries in {getPdfCategoryLabel(pdfCategory)}. Choose another category or add entries first.
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="h-9 px-4 text-sm font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pdfFilteredCount === 0}
                onClick={handleConfirmDownloadPdf}
                className="h-9 px-5 inline-flex items-center gap-1.5 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <FileDown className="w-4 h-4" aria-hidden="true" />
                Download PDF Study Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
