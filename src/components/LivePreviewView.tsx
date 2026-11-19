import React, { useEffect, useRef, useState } from 'react';
import { GoogleSheetsBar, GoogleSheetsController } from './GoogleSheetsBar';
import {
  CATEGORIES,
  Category,
  VocabEntry,
  detectCategory,
  extractContextSentence,
  getCategoryCounts,
  normalizeExpression,
  parseBulkInput,
} from '../utils/vocabLogic';

interface SheetSyncOutcome {
  attempted: boolean;
  synced: boolean;
  tabName?: string;
  error?: string;
}

interface AnalyseOutcome {
  ok: boolean;
  duplicate?: boolean;
  entry?: VocabEntry;
  error?: string;
  sheetSync?: SheetSyncOutcome;
}

interface LivePreviewViewProps {
  entries: VocabEntry[];
  sheets: GoogleSheetsController;
  onSaveAndAnalyse: (params: {
    expression: string;
    category: Category;
    contextSentence: string;
    sourceTitle: string;
    sourceUrl: string;
  }) => Promise<AnalyseOutcome>;
  onOpenLibrary: () => void;
  onOpenInstallGuide: () => void;
}

interface FloatingSelection {
  expression: string;
  category: Category;
  contextSentence: string;
  top: number;
  left: number;
}

const SAMPLE_ARTICLE = {
  publication: 'Sample Reading Passage — Aeon / Long-Form Editorial Style',
  title: 'The Quiet Craft of Slow Reading in an Age of Skimming',
  byline: 'Practice article · Select any word, idiom, or phrasal verb below',
  paragraphs: [
    'Most students today put off deep reading until the final weeks before an exam, assuming that quick summaries will be enough. Yet careful, meticulous reading builds a natural instinct for tone, structure, and vocabulary that no last-minute list can replace.',
    'When you slow down and read an essay from start to finish, a difficult sentence is often a blessing in disguise: pausing to understand it fixes the expression in your memory far better than passive highlighting. Over time, a pragmatic habit of collecting just five useful expressions a day outperforms hours of cramming.',
    'Readers who bite the bullet and engage with unfamiliar essays soon look forward to encountering fresh phrases. Even if an online trend feels ephemeral, the clarity gained from noticing how writers use an unexpected aberration or subtle turn of phrase stays with you well beyond exam day.',
  ],
};

const QUICK_TEST_PHRASES = [
  'put off',
  'meticulous',
  'a blessing in disguise',
  'pragmatic',
  'bite the bullet',
  'look forward to',
  'ephemeral',
];

export const LivePreviewView: React.FC<LivePreviewViewProps> = ({
  entries,
  sheets,
  onSaveAndAnalyse,
  onOpenLibrary,
  onOpenInstallGuide,
}) => {
  const articleRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLDivElement | null>(null);

  // Floating selection widget state
  const [selection, setSelection] = useState<FloatingSelection | null>(null);
  const [panelMode, setPanelMode] = useState<'hidden' | 'button' | 'confirm' | 'saving' | 'result' | 'error'>('hidden');
  const [savedResult, setSavedResult] = useState<VocabEntry | null>(null);
  const [savedSheetSync, setSavedSheetSync] = useState<SheetSyncOutcome | null>(null);
  const [floatError, setFloatError] = useState('');

  // Popup simulator state
  const [manualInput, setManualInput] = useState('');
  const [manualCategory, setManualCategory] = useState<'auto' | Category>('auto');
  const [isPopupBusy, setIsPopupBusy] = useState(false);
  const [popupStatus, setPopupStatus] = useState<{
    summary: string;
    tone: 'neutral' | 'success' | 'error';
    details: Array<{ text: string; isError: boolean }>;
  } | null>(null);
  const [showSettingsInfo, setShowSettingsInfo] = useState(false);

  const counts = getCategoryCounts(entries);
  const recentEntries = entries.slice(0, 4);

  const hideFloating = () => {
    setPanelMode('hidden');
    setSelection(null);
    setSavedResult(null);
    setSavedSheetSync(null);
    setFloatError('');
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (floatRef.current && floatRef.current.contains(e.target as Node)) {
        return;
      }
      if (panelMode !== 'hidden') {
        hideFloating();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelMode !== 'hidden') {
        hideFloating();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [panelMode]);

  const captureFromRange = (range: Range, rawText: string) => {
    if (!articleRef.current) return;
    const cleaned = normalizeExpression(rawText);
    if (!cleaned || cleaned.length < 2 || cleaned.split(/\s+/).length > 10) return;

    const containerRect = articleRef.current.getBoundingClientRect();
    const selRect = range.getBoundingClientRect();
    if (!selRect || (selRect.width === 0 && selRect.height === 0)) return;

    let blockNode: Node | null = range.commonAncestorContainer;
    if (blockNode.nodeType === Node.TEXT_NODE) blockNode = blockNode.parentElement;
    const blockText = (blockNode as HTMLElement | null)?.innerText || (blockNode?.textContent ?? '');
    const contextSentence = extractContextSentence(blockText, cleaned);

    const relTop = selRect.bottom - containerRect.top + 8;
    const relLeft = Math.max(
      12,
      Math.min(selRect.left - containerRect.left + selRect.width / 2 - 80, containerRect.width - 310)
    );

    setSelection({
      expression: cleaned,
      category: detectCategory(cleaned),
      contextSentence,
      top: relTop,
      left: relLeft,
    });
    setPanelMode('button');
    setSavedResult(null);
    setFloatError('');
  };

  const handleArticleMouseUp = () => {
    if (panelMode === 'confirm' || panelMode === 'saving') return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      if (panelMode === 'button') hideFloating();
      return;
    }
    const range = sel.getRangeAt(0);
    if (!articleRef.current?.contains(range.commonAncestorContainer)) return;
    captureFromRange(range, sel.toString());
  };

  const handleQuickSelectPhrase = (phrase: string) => {
    if (!articleRef.current) return;
    const paragraphs = Array.from(articleRef.current.querySelectorAll('p[data-sample-para="true"]'));
    for (const p of paragraphs) {
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      let node: Node | null = walker.nextNode();
      while (node) {
        const text = node.textContent || '';
        const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
        if (idx !== -1) {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + phrase.length);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          captureFromRange(range, text.slice(idx, idx + phrase.length));
          return;
        }
        node = walker.nextNode();
      }
    }
  };

  const handleFloatingSave = async () => {
    if (!selection || panelMode === 'saving') return;
    setPanelMode('saving');
    setFloatError('');

    const outcome = await onSaveAndAnalyse({
      expression: selection.expression,
      category: selection.category,
      contextSentence: selection.contextSentence,
      sourceTitle: SAMPLE_ARTICLE.title,
      sourceUrl: 'https://aeon.co/essays/slow-reading-sample',
    });

    if (outcome.ok && outcome.entry) {
      setSavedResult(outcome.entry);
      setSavedSheetSync(outcome.sheetSync || null);
      setPanelMode('result');
    } else {
      setFloatError(outcome.error || 'Could not analyse this expression.');
      setPanelMode('error');
    }
  };

  const handlePopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPopupBusy) return;

    const list = parseBulkInput(manualInput);
    if (list.length === 0) {
      setPopupStatus({
        summary: 'Enter at least one word, idiom, or phrasal verb.',
        tone: 'error',
        details: [],
      });
      return;
    }

    setIsPopupBusy(true);
    let savedCount = 0;
    let dupCount = 0;
    let failCount = 0;
    const details: Array<{ text: string; isError: boolean }> = [];

    for (let i = 0; i < list.length; i++) {
      const expr = list[i];
      const cat = manualCategory === 'auto' ? detectCategory(expr) : manualCategory;
      setPopupStatus({
        summary: list.length === 1 ? `Analysing "${expr}"…` : `Analysing ${i + 1} of ${list.length}: "${expr}"…`,
        tone: 'neutral',
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
        savedCount++;
        const sheetNote = outcome.sheetSync?.synced
          ? ` · Added to Sheet (${outcome.sheetSync.tabName})`
          : outcome.sheetSync?.attempted && outcome.sheetSync.error
          ? ' · Sheet sync failed'
          : '';
        details.push({
          text: `Saved "${outcome.entry.expression}" (${CATEGORIES[outcome.entry.category]})${sheetNote}`,
          isError: false,
        });
      } else if (outcome.duplicate) {
        dupCount++;
        details.push({ text: `Skipped duplicate: "${expr}"`, isError: false });
      } else {
        failCount++;
        details.push({
          text: `Failed "${expr}": ${outcome.error || 'Analysis failed'}`,
          isError: true,
        });
      }
    }

    const parts: string[] = [];
    if (savedCount > 0) parts.push(`${savedCount} saved`);
    if (dupCount > 0) parts.push(`${dupCount} skipped (duplicate)`);
    if (failCount > 0) parts.push(`${failCount} failed`);

    setPopupStatus({
      summary: `Done: ${parts.join(', ')}.`,
      tone: failCount > 0 && savedCount === 0 ? 'error' : savedCount > 0 ? 'success' : 'neutral',
      details,
    });

    if (savedCount > 0 && failCount === 0) {
      setManualInput('');
    }
    setIsPopupBusy(false);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="max-w-2xl">
          <h1 className="text-[26px] md:text-[31px] font-semibold tracking-tight text-slate-900 leading-tight [text-wrap:balance]">
            CUET UG 2027 Vocabulary Collector for Brave
          </h1>
          <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">
            Highlight any English word, idiom, or phrasal verb in the article below to test the floating capture flow, or try bulk entry in the Brave popup preview on the right. Download the complete Manifest V3 ZIP at any time to load directly into Brave.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 shrink-0">
          <span>Manifest V3</span>
          <span aria-hidden="true">·</span>
          <span>Vanilla HTML/CSS/JS</span>
          <span aria-hidden="true">·</span>
          <span>Google Sheets Auto-Save</span>
        </div>
      </div>

      {/* Google Sheets Auto-Save Connection Bar */}
      <GoogleSheetsBar sheets={sheets} />

      {/* Main 2-Zone Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_384px] gap-7 items-start">
        {/* Left Zone: Live Webpage Selection Sandbox */}
        <section
          ref={articleRef}
          onMouseUp={handleArticleMouseUp}
          className="relative bg-white border border-slate-200 rounded-lg p-5 sm:p-7"
          aria-labelledby="sample-article-title"
        >
          <p className="text-xs font-medium text-slate-500 mb-1.5">
            {SAMPLE_ARTICLE.publication}
          </p>
          <h2 id="sample-article-title" className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight leading-snug">
            {SAMPLE_ARTICLE.title}
          </h2>
          <p className="mt-1.5 text-[13px] text-slate-500 pb-4 mb-5 border-b border-slate-200">
            {SAMPLE_ARTICLE.byline}
          </p>

          <div className="article-prose space-y-4 text-[15.5px] leading-[1.72] text-slate-800 max-w-[68ch]">
            {SAMPLE_ARTICLE.paragraphs.map((para, idx) => (
              <p key={idx} data-sample-para="true">
                {para}
              </p>
            ))}
          </div>

          {/* Quick Selection Helpers */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <span className="font-medium text-slate-500">Quick-select an expression to test:</span>
            {QUICK_TEST_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleQuickSelectPhrase(phrase)}
                className="text-teal-800 hover:text-teal-950 underline underline-offset-4 decoration-slate-300 hover:decoration-teal-700 font-medium cursor-pointer transition-colors whitespace-nowrap"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Floating "Save to CUET List" Button & Confirmation Panel */}
          {panelMode !== 'hidden' && selection && (
            <div
              ref={floatRef}
              onMouseDown={(e) => e.preventDefault()}
              style={{ top: selection.top, left: selection.left }}
              className="absolute z-30"
            >
              {panelMode === 'button' ? (
                <button
                  type="button"
                  onClick={() => setPanelMode('confirm')}
                  className="px-3.5 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-md shadow-md hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap cursor-pointer"
                >
                  Save to CUET List
                </button>
              ) : (
                <div
                  role="dialog"
                  aria-label="Save to CUET List confirmation"
                  className="w-[310px] max-w-[calc(100vw-48px)] bg-white border border-slate-300 rounded-lg shadow-lg p-4 text-slate-900"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500">CUET Vocabulary Builder</p>
                      <p className="text-[16px] font-bold text-slate-900 leading-snug break-words">
                        {selection.expression}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={hideFloating}
                      aria-label="Close confirmation panel"
                      className="text-slate-400 hover:text-slate-800 text-lg leading-none px-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>

                  {(panelMode === 'confirm' || panelMode === 'saving') && (
                    <>
                      <p className="text-xs font-medium text-slate-600 mb-2">
                        Category (auto-detected — click to change)
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 mb-3.5">
                        {(
                          [
                            { key: 'vocabulary', label: 'Word' },
                            { key: 'idioms', label: 'Idiom' },
                            { key: 'phrasalVerbs', label: 'Phrasal Verb' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            disabled={panelMode === 'saving'}
                            aria-pressed={selection.category === opt.key}
                            onClick={() => setSelection({ ...selection, category: opt.key })}
                            className={`px-2 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                              selection.category === opt.key
                                ? 'bg-teal-700 border-teal-700 text-white'
                                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={hideFloating}
                          disabled={panelMode === 'saving'}
                          className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleFloatingSave}
                          disabled={panelMode === 'saving'}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                        >
                          {panelMode === 'saving' ? 'Analysing…' : 'Save'}
                        </button>
                      </div>
                    </>
                  )}

                  {panelMode === 'result' && savedResult && (
                    <div>
                      <p className="text-xs font-semibold text-teal-700 mb-2">
                        Saved to {CATEGORIES[savedResult.category]}
                        {savedSheetSync?.synced && savedSheetSync.tabName
                          ? ` · Added to Google Sheet (${savedSheetSync.tabName})`
                          : ''}
                      </p>
                      {savedSheetSync?.attempted && !savedSheetSync.synced && savedSheetSync.error && (
                        <p className="text-[11.5px] text-amber-700 mb-2">
                          {savedSheetSync.error}
                        </p>
                      )}
                      <p className="text-[13px] text-slate-700 mb-1.5">
                        <strong className="text-slate-900">Meaning:</strong> {savedResult.meaning}
                      </p>
                      <p className="text-[13px] text-slate-700 mb-3.5">
                        <strong className="text-slate-900">Example:</strong> {savedResult.example}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            hideFloating();
                            onOpenLibrary();
                          }}
                          className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-800 hover:bg-slate-50 cursor-pointer"
                        >
                          Open Library
                        </button>
                        <button
                          type="button"
                          onClick={hideFloating}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}

                  {panelMode === 'error' && (
                    <div>
                      <p className="text-[13px] text-red-700 mb-3">{floatError}</p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={hideFloating}
                          className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Zone: Authentic Brave Extension Popup Simulator */}
        <aside aria-label="Brave Extension Popup Preview" className="w-full max-w-[384px] mx-auto lg:mx-0">
          <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
            {/* Popup Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200">
              <span className="text-[15px] font-bold tracking-tight text-slate-900">
                CUET Vocabulary Builder
              </span>
              <button
                type="button"
                onClick={() => setShowSettingsInfo((v) => !v)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 px-1.5 py-1 rounded cursor-pointer"
              >
                Settings
              </button>
            </div>

            {showSettingsInfo && (
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 space-y-1.5">
                <p className="font-semibold text-slate-900">Extension Settings (Brave Local Storage)</p>
                <p>
                  In the downloaded Brave extension, Settings opens <code>settings.html</code> where you save your personal Gemini API key, select the model, and test the connection. Here in the live web preview, Gemini runs automatically so you can test right away.
                </p>
                <button
                  type="button"
                  onClick={onOpenInstallGuide}
                  className="text-teal-700 font-semibold underline cursor-pointer"
                >
                  View Brave setup guide
                </button>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Manual / Bulk Entry Form */}
              <form onSubmit={handlePopupSubmit} className="space-y-2.5" noValidate>
                <label htmlFor="popup-manual-input" className="block text-xs font-semibold text-slate-700">
                  Add word, idiom, or phrasal verb
                </label>
                <textarea
                  id="popup-manual-input"
                  rows={3}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={'Single entry or multiple separated by commas or new lines\ne.g. aberration, break the ice, put off'}
                  className="w-full px-3 py-2 text-[13px] border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 resize-y"
                />

                <div className="flex items-center gap-2">
                  <label htmlFor="popup-category-select" className="sr-only">
                    Category
                  </label>
                  <select
                    id="popup-category-select"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as 'auto' | Category)}
                    className="flex-1 h-9 px-2.5 text-[12.5px] font-medium border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-teal-700"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="vocabulary">Vocabulary</option>
                    <option value="idioms">Idioms</option>
                    <option value="phrasalVerbs">Phrasal Verbs</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isPopupBusy}
                    className="h-9 px-3.5 text-[12.5px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap cursor-pointer"
                  >
                    {isPopupBusy ? 'Analysing…' : 'Save and Analyse'}
                  </button>
                </div>
              </form>

              {popupStatus && (
                <div
                  aria-live="polite"
                  className={`p-2.5 rounded-md border text-xs ${
                    popupStatus.tone === 'error'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : popupStatus.tone === 'success'
                      ? 'bg-teal-50/70 border-teal-200 text-teal-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <p className="font-semibold">{popupStatus.summary}</p>
                  {popupStatus.details.length > 0 && (
                    <ul className="mt-1.5 pl-4 list-disc space-y-0.5 max-h-24 overflow-y-auto">
                      {popupStatus.details.map((d, idx) => (
                        <li key={idx} className={d.isError ? 'text-red-700' : 'text-slate-700'}>
                          {d.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Unboxed Tabular Counts Strip */}
              <div className="flex items-center justify-between py-2.5 border-y border-slate-200">
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight" data-testid="popup-count-vocabulary">
                    {counts.vocabulary}
                  </div>
                  <div className="text-[11.5px] text-slate-500">Vocabulary</div>
                </div>
                <div className="w-px h-7 bg-slate-200" aria-hidden="true" />
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight" data-testid="popup-count-idioms">
                    {counts.idioms}
                  </div>
                  <div className="text-[11.5px] text-slate-500">Idioms</div>
                </div>
                <div className="w-px h-7 bg-slate-200" aria-hidden="true" />
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight" data-testid="popup-count-phrasal">
                    {counts.phrasalVerbs}
                  </div>
                  <div className="text-[11.5px] text-slate-500">Phrasal Verbs</div>
                </div>
              </div>

              {/* Recently Saved */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-1.5">Recently Saved</h3>
                {recentEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 py-1">No entries saved yet.</p>
                ) : (
                  <div className="divide-y divide-slate-200 max-h-44 overflow-y-auto">
                    {recentEntries.map((item) => (
                      <div key={item.id} className="py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-semibold text-slate-900">
                            {item.expression}
                          </span>
                          <span className="text-[11px] text-slate-500 whitespace-nowrap">
                            {CATEGORIES[item.category]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{item.meaning}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Popup Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={onOpenLibrary}
                className="w-full h-9 text-[13px] font-semibold bg-white border border-slate-300 rounded-md text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Open My CUET Library
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
