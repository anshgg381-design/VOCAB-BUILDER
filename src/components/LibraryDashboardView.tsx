import React, { useMemo, useRef, useState } from 'react';
import { GoogleSheetsBar, GoogleSheetsController } from './GoogleSheetsBar';
import {
  CATEGORIES,
  Category,
  VocabEntry,
  buildCsv,
  buildExportJson,
  detectCategory,
  formatDate,
  getCategoryCounts,
  parseBulkInput,
  validateAndMergeImport,
} from '../utils/vocabLogic';

interface SheetSyncOutcome {
  attempted: boolean;
  synced: boolean;
  tabName?: string;
  error?: string;
}

interface LibraryDashboardViewProps {
  entries: VocabEntry[];
  sheets: GoogleSheetsController;
  onSaveAndAnalyse: (params: {
    expression: string;
    category: Category;
    contextSentence: string;
    sourceTitle: string;
    sourceUrl: string;
  }) => Promise<{ ok: boolean; duplicate?: boolean; entry?: VocabEntry; error?: string; sheetSync?: SheetSyncOutcome }>;
  onUpdateEntry: (id: string, patch: Partial<VocabEntry>) => { ok: boolean; error?: string };
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
  onReanalyseEntry: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onMergeImported: (merged: VocabEntry[]) => void;
}

export const LibraryDashboardView: React.FC<LibraryDashboardViewProps> = ({
  entries,
  sheets,
  onSaveAndAnalyse,
  onUpdateEntry,
  onDeleteEntry,
  onClearAll,
  onReanalyseEntry,
  onMergeImported,
}) => {
  const [activeTab, setActiveTab] = useState<Category>('vocabulary');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlearned' | 'learned' | 'favourites'>('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'az' | 'za'>('recent');

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showBackupPanel, setShowBackupPanel] = useState(false);

  // Add / Bulk panel state
  const [bulkText, setBulkText] = useState('');
  const [bulkCategory, setBulkCategory] = useState<'auto' | Category>('auto');
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{
    summary: string;
    details: Array<{ text: string; isError: boolean }>;
  } | null>(null);

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

  // Confirm modal state
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const counts = getCategoryCounts(entries);

  const notify = (text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone });
  };

  const visibleEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = entries.filter((e) => e.category === activeTab);

    if (statusFilter === 'learned') list = list.filter((e) => e.learned);
    else if (statusFilter === 'unlearned') list = list.filter((e) => !e.learned);
    else if (statusFilter === 'favourites') list = list.filter((e) => e.favourite);

    if (q) {
      list = list.filter(
        (e) =>
          e.expression.toLowerCase().includes(q) ||
          e.meaning.toLowerCase().includes(q) ||
          e.example.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortOrder === 'az') {
      sorted.sort((a, b) => a.expression.localeCompare(b.expression, undefined, { sensitivity: 'base' }));
    } else if (sortOrder === 'za') {
      sorted.sort((a, b) => b.expression.localeCompare(a.expression, undefined, { sensitivity: 'base' }));
    } else {
      sorted.sort((a, b) => Date.parse(b.dateAdded) - Date.parse(a.dateAdded));
    }
    return sorted;
  }, [entries, activeTab, searchQuery, statusFilter, sortOrder]);

  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    triggerDownload(`cuet-vocab-backup-${stamp}.json`, JSON.stringify(backup, null, 2), 'application/json');
    notify(`Exported ${entries.length} entries as JSON backup (API key excluded).`, 'ok');
  };

  const handleExportCsv = () => {
    const csv = buildCsv(entries);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(`cuet-vocab-${stamp}.csv`, csv, 'text/csv;charset=utf-8');
    notify(`Exported ${entries.length} entries as CSV.`, 'ok');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        notify('Could not import: file is not valid JSON.', 'error');
        return;
      }
      const res = validateAndMergeImport(entries, parsed);
      if (!res.ok) {
        notify(res.error || 'Invalid backup file.', 'error');
        return;
      }
      onMergeImported(res.mergedEntries);
      notify(
        `Imported ${res.addedCount} new ${res.addedCount === 1 ? 'entry' : 'entries'} (${res.skippedCount} existing skipped safely).`,
        'ok'
      );
    } catch {
      notify('Could not read the selected file.', 'error');
    }
  };

  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
            My CUET Library
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Three focused collections with simple meanings and one natural example sentence.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowAddPanel((v) => !v);
              setShowBackupPanel(false);
            }}
            className="h-9 px-3.5 text-[13px] font-medium bg-white border border-slate-300 rounded-md text-slate-900 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            Add Entries
          </button>
          <button
            type="button"
            onClick={() => {
              setShowBackupPanel((v) => !v);
              setShowAddPanel(false);
            }}
            className="h-9 px-3.5 text-[13px] font-medium bg-white border border-slate-300 rounded-md text-slate-900 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            Backup &amp; Export
          </button>
        </div>
      </div>

      {/* Google Sheets Auto-Save Bar */}
      <GoogleSheetsBar sheets={sheets} />

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          className={`flex items-center justify-between gap-4 px-4 py-2.5 rounded-md border text-[13.5px] ${
            toast.tone === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-teal-50/70 border-teal-200 text-teal-900'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Collapsible Manual & Bulk Entry */}
      {showAddPanel && (
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3" aria-label="Manual and bulk entry">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Manual &amp; Bulk Entry</h2>
            <button
              type="button"
              onClick={() => setShowAddPanel(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
          </div>
          <form onSubmit={handleBulkSubmit} className="space-y-3" noValidate>
            <label htmlFor="lib-bulk-input" className="block text-[13px] font-medium text-slate-700">
              Enter one expression or multiple separated by commas or new lines
            </label>
            <textarea
              id="lib-bulk-input"
              rows={3}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'aberration, meticulous, pragmatic\nBreak the ice\nCome across'}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-teal-700"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="lib-bulk-cat" className="text-[13px] font-medium text-slate-600">
                  Category
                </label>
                <select
                  id="lib-bulk-cat"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as 'auto' | Category)}
                  className="h-9 px-2.5 text-[13px] border border-slate-300 rounded-md bg-white text-slate-900"
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
                className="h-9 px-4 text-[13px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                {isBulkBusy ? 'Analysing…' : 'Save and Analyse'}
              </button>
            </div>
            {bulkFeedback && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1">
                <p className="font-semibold text-slate-900">{bulkFeedback.summary}</p>
                {bulkFeedback.details.length > 0 && (
                  <ul className="pl-4 list-disc space-y-0.5">
                    {bulkFeedback.details.map((d, i) => (
                      <li key={i} className={d.isError ? 'text-red-700' : 'text-slate-700'}>
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

      {/* Collapsible Backup & Export Panel */}
      {showBackupPanel && (
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3" aria-label="Backup and export">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Local Storage &amp; Backups</h2>
            <button
              type="button"
              onClick={() => setShowBackupPanel(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-[13.5px] text-slate-600 max-w-[70ch]">
            All entries are stored locally in your browser. In Brave, uninstalling the extension may remove its locally stored data, so periodically export a JSON backup. Exported backups never include your Gemini API key.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleExportJson}
              className="h-9 px-3.5 text-[13px] font-medium bg-white border border-slate-300 rounded-md text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              Export JSON Backup
            </button>
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
              className="h-9 px-3.5 text-[13px] font-medium bg-white border border-slate-300 rounded-md text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              Import JSON Backup
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
              onClick={handleExportCsv}
              className="h-9 px-3.5 text-[13px] font-medium bg-white border border-slate-300 rounded-md text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              Export All as CSV
            </button>
            <button
              type="button"
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
                    notify('Library cleared.', 'ok');
                  },
                });
              }}
              className="h-9 px-3.5 text-[13px] font-medium bg-white border border-red-200 rounded-md text-red-700 hover:bg-red-50 cursor-pointer"
            >
              Clear Library
            </button>
          </div>
        </section>
      )}

      {/* Three Collection Tabs */}
      <div role="tablist" aria-label="Vocabulary collections" className="flex items-center gap-7 border-b border-slate-200 overflow-x-auto">
        {(['vocabulary', 'idioms', 'phrasalVerbs'] as Category[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 pt-1 text-[15px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {CATEGORIES[tab]}{' '}
              <span className="ml-1 text-[13px] font-medium text-slate-400 tabular-nums">
                {counts[tab]}
              </span>
              {active && <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-teal-700" />}
            </button>
          );
        })}
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1">
          <label htmlFor="library-search" className="sr-only">
            Search saved entries
          </label>
          <input
            id="library-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expressions, meanings, or examples…"
            className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-teal-700"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="library-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="library-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 px-3 text-sm border border-slate-300 rounded-md bg-white text-slate-900"
          >
            <option value="all">All entries</option>
            <option value="unlearned">Unlearned</option>
            <option value="learned">Learned</option>
            <option value="favourites">Favourites</option>
          </select>

          <label htmlFor="library-sort" className="sr-only">
            Sort order
          </label>
          <select
            id="library-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="h-10 px-3 text-sm border border-slate-300 rounded-md bg-white text-slate-900"
          >
            <option value="recent">Recently added</option>
            <option value="az">Alphabetical (A–Z)</option>
            <option value="za">Alphabetical (Z–A)</option>
          </select>
        </div>
      </div>

      {/* Entries List */}
      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        {visibleEntries.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <p className="text-[15px] font-semibold text-slate-900">
              {searchQuery || statusFilter !== 'all'
                ? 'No matching entries'
                : `No ${CATEGORIES[activeTab].toLowerCase()} saved yet`}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Clear your search query or change the filter above.'
                : 'Select text in Live Preview or click "Add Entries" above to start building this list.'}
            </p>
          </div>
        ) : (
          visibleEntries.map((entry) => (
            <article
              key={entry.id}
              className={`px-6 py-5 ${entry.learned ? 'bg-slate-50/50' : 'bg-white'}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h3 className="text-[19px] font-bold tracking-tight text-slate-900">
                  {entry.expression}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                  <span>{formatDate(entry.dateAdded)}</span>
                  <span aria-hidden="true">·</span>
                  <span className={entry.learned ? 'text-teal-700 font-semibold' : ''}>
                    {entry.learned ? 'Learned' : 'Unlearned'}
                  </span>
                  {entry.favourite && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-700 font-semibold">Favourite</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-[15px] text-slate-700 max-w-[70ch]">
                <p>
                  <strong className="font-semibold text-slate-900">Meaning:</strong> {entry.meaning}
                </p>
                <p>
                  <strong className="font-semibold text-slate-900">Example:</strong> {entry.example}
                </p>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
                <button
                  type="button"
                  onClick={() => onUpdateEntry(entry.id, { learned: !entry.learned })}
                  className={`font-medium hover:underline cursor-pointer ${
                    entry.learned ? 'text-teal-700' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {entry.learned ? 'Mark Unlearned' : 'Mark Learned'}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateEntry(entry.id, { favourite: !entry.favourite })}
                  className={`font-medium hover:underline cursor-pointer ${
                    entry.favourite ? 'text-amber-700' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {entry.favourite ? 'Remove Favourite' : 'Favourite'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(entry)}
                  aria-label={`Edit ${entry.expression}`}
                  className="font-medium text-slate-500 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={reanalysingId === entry.id}
                  onClick={() => handleReanalyse(entry)}
                  aria-label={`Reanalyse ${entry.expression}`}
                  className="font-medium text-slate-500 hover:text-slate-900 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {reanalysingId === entry.id ? 'Reanalysing…' : 'Reanalyse'}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${entry.expression}`}
                  onClick={() =>
                    setConfirmState({
                      title: 'Delete Entry',
                      message: `Remove "${entry.expression}" from your CUET library? This cannot be undone.`,
                      confirmLabel: 'Delete Entry',
                      onConfirm: () => {
                        onDeleteEntry(entry.id);
                        notify(`Deleted "${entry.expression}".`, 'ok');
                      },
                    })
                  }
                  className="font-medium text-slate-500 hover:text-red-700 hover:underline cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-[500px] bg-white border border-slate-200 rounded-lg shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="edit-modal-title" className="text-lg font-semibold text-slate-900">
                Edit Entry
              </h2>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-sm text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-expr-input" className="block text-xs font-semibold text-slate-700">
                Expression
              </label>
              <input
                id="edit-expr-input"
                type="text"
                value={editExpression}
                onChange={(e) => setEditExpression(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-cat-select" className="block text-xs font-semibold text-slate-700">
                Collection
              </label>
              <select
                id="edit-cat-select"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as Category)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="vocabulary">Vocabulary</option>
                <option value="idioms">Idioms</option>
                <option value="phrasalVerbs">Phrasal Verbs</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-meaning-input" className="block text-xs font-semibold text-slate-700">
                Meaning
              </label>
              <textarea
                id="edit-meaning-input"
                rows={3}
                value={editMeaning}
                onChange={(e) => setEditMeaning(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-example-input" className="block text-xs font-semibold text-slate-700">
                Example Sentence
              </label>
              <textarea
                id="edit-example-input"
                rows={2}
                value={editExample}
                onChange={(e) => setEditExample(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            {editError && <p className="text-xs text-red-700">{editError}</p>}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="h-9 px-4 text-sm font-medium border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 text-sm font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete / Clear Modal */}
      {confirmState && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-lg shadow-xl p-6 space-y-4">
            <h2 id="confirm-modal-title" className="text-lg font-semibold text-slate-900">
              {confirmState.title}
            </h2>
            <p className="text-sm text-slate-600">{confirmState.message}</p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="h-9 px-4 text-sm font-medium border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
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
                className="h-9 px-4 text-sm font-semibold bg-red-700 text-white rounded-md hover:bg-red-800 cursor-pointer"
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
