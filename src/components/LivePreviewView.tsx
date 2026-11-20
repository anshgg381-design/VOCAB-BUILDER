import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleSheetsBar, GoogleSheetsController } from './GoogleSheetsBar';
import {
  CATEGORIES,
  Category,
  MASTERY_LABELS,
  VocabEntry,
  buildHighlightMatcher,
  detectCategory,
  extractContextSentence,
  getCategoryCounts,
  getMasteryLevel,
  normalizeExpression,
  normalizeKey,
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
  onOpenHowItWorks?: () => void;
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
  onOpenHowItWorks,
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

  // In-Page Word Highlighter state (underlines saved New & Learning words in the reading sandbox)
  const [highlighterEnabled, setHighlighterEnabled] = useState(true);
  const [peekState, setPeekState] = useState<{
    entry: VocabEntry;
    top: number;
    left: number;
  } | null>(null);
  const peekHideTimerRef = useRef<number | null>(null);

  const highlightMatcher = useMemo(
    () => (highlighterEnabled ? buildHighlightMatcher(entries) : { regex: null, map: new Map<string, VocabEntry>(), count: 0 }),
    [entries, highlighterEnabled]
  );

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
      if (e.key === 'Escape') {
        if (panelMode !== 'hidden') hideFloating();
        if (peekState) setPeekState(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [panelMode, peekState]);

  const cancelPeekHide = () => {
    if (peekHideTimerRef.current !== null) {
      window.clearTimeout(peekHideTimerRef.current);
      peekHideTimerRef.current = null;
    }
  };

  const schedulePeekHide = () => {
    cancelPeekHide();
    peekHideTimerRef.current = window.setTimeout(() => {
      setPeekState(null);
    }, 140);
  };

  const showPeekForElement = (el: HTMLElement, entry: VocabEntry) => {
    if (!articleRef.current) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    cancelPeekHide();
    const containerRect = articleRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const relTop = Math.max(8, elRect.bottom - containerRect.top + 8);
    const relLeft = Math.max(
      12,
      Math.min(elRect.left - containerRect.left, containerRect.width - 300)
    );
    setPeekState({ entry, top: relTop, left: relLeft });
  };

  const renderHighlightedParagraph = (paragraph: string) => {
    if (!highlightMatcher.regex) return paragraph;
    const re = new RegExp(highlightMatcher.regex.source, 'gi');
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let partIdx = 0;

    while ((match = re.exec(paragraph)) !== null) {
      const matchedText = match[0];
      const matchEntry = highlightMatcher.map.get(normalizeKey(matchedText));
      if (!matchEntry) continue;

      if (match.index > lastIndex) {
        nodes.push(paragraph.slice(lastIndex, match.index));
      }

      const level = getMasteryLevel(matchEntry);
      nodes.push(
        <span
          key={`hl-${partIdx++}-${match.index}`}
          role="button"
          tabIndex={0}
          data-vocab-highlight="true"
          data-mastery={level}
          onMouseEnter={(e) => showPeekForElement(e.currentTarget, matchEntry)}
          onMouseLeave={schedulePeekHide}
          onFocus={(e) => showPeekForElement(e.currentTarget, matchEntry)}
          onBlur={schedulePeekHide}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              showPeekForElement(e.currentTarget, matchEntry);
            }
          }}
          className={`inline rounded-sm px-0.5 border-b-2 border-dotted transition-colors cursor-help focus:outline-none focus:ring-2 focus:ring-[#002962]/30 dark:focus:ring-[#60A5FA]/40 ${
            level === 'learning'
              ? 'border-[#0F766E] dark:border-[#2DD4BF] bg-[#F0FDFA] dark:bg-[#0F766E]/25 hover:bg-[#CCFBF1] dark:hover:bg-[#0F766E]/40'
              : 'border-[#EA580C] dark:border-[#FB923C] bg-[#FFF7ED] dark:bg-[#EA580C]/20 hover:bg-[#FFEDD5] dark:hover:bg-[#EA580C]/35'
          }`}
          title={`${matchEntry.expression} (${MASTERY_LABELS[level]}) — hover or focus to peek meaning`}
        >
          {matchedText}
        </span>
      );
      lastIndex = match.index + matchedText.length;
    }

    if (lastIndex < paragraph.length) {
      nodes.push(paragraph.slice(lastIndex));
    }
    return nodes.length > 0 ? nodes : paragraph;
  };

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
      {/* Nesoi Architectural Hero Display + Midnight Navy Showcase Panel */}
      <section aria-labelledby="hero-display-title" className="space-y-4">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/20 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3B5578] dark:text-[#9FB3CE]">
            <span className="text-[#002962] dark:text-[#93C5FD] font-bold">IPMAT &amp; CUET</span>
            <span className="text-[#002962]/25 dark:text-[#93C5FD]/30">|</span>
            <span>Chrome · Brave · Edge · Vivaldi · Opera · Arc · Chromium</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <h1
              id="hero-display-title"
              className="font-editorial text-[34px] sm:text-[46px] md:text-[52px] font-light tracking-[-0.03em] text-[#002962] dark:text-[#F1F5F9] leading-[1.06] [text-wrap:balance] max-w-[19ch] sm:max-w-none"
            >
              IPMAT/CUET VOCAB BUILDER
              <span className="text-[#EA580C] font-semibold" aria-hidden="true">.</span>
            </h1>
          </div>
        </div>

        <div className="nesoi-navy-panel rounded-xl text-white overflow-hidden shadow-md border border-[#002962] dark:border-[#93C5FD]/20">
          {/* Top Hairline Quick-Navigation Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 border-b border-white/15 px-4 sm:px-7">
            {[
              { label: 'Reading Sandbox', onClick: () => articleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
              { label: 'Words & Idioms', onClick: onOpenLibrary },
              { label: 'Insights & Charts', onClick: onOpenLibrary },
              { label: 'Study & Quiz', onClick: onOpenLibrary },
              { label: 'How It Works', onClick: onOpenHowItWorks || onOpenInstallGuide },
              { label: 'Install Guide', onClick: onOpenInstallGuide },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="py-3 text-center text-[12.5px] font-medium text-[#DCE8FA]/85 hover:text-white transition-colors border-b-2 border-transparent hover:border-[#EA580C] cursor-pointer truncate"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Navy Showcase Body */}
          <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#FDBA74]">
                ENGLISH COLLECTOR · MANIFEST V3
              </p>
              <h2 className="font-editorial text-2xl sm:text-[31px] font-light tracking-[-0.025em] text-white leading-[1.14]">
                Effortless vocabulary prep that actually sticks
                <span className="text-[#EA580C] font-semibold" aria-hidden="true">.</span>
              </h2>
              <p className="text-[14.5px] text-[#DCE8FA]/90 leading-relaxed">
                Highlight any word, idiom, or phrasal verb (or press Alt+Shift+V / right-click in the extension) to fetch its plain meaning, auto-save to Google Sheets with two-way Pull, hover highlighted words on articles, and export PDFs or Anki decks.
              </p>
            </div>

            {/* Bottom-right Architectural CTA Box */}
            <button
              type="button"
              onClick={onOpenLibrary}
              className="group text-left bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/25 rounded-lg px-5 py-3.5 transition-colors shrink-0 cursor-pointer min-w-[236px]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">Ready to revise?</span>
                <span className="text-[#FDBA74] group-hover:translate-x-0.5 transition-transform text-sm" aria-hidden="true">
                  →
                </span>
              </div>
              <p className="text-xs text-[#DCE8FA]/85 mt-0.5">
                Open THE VOCAB VAULT ({entries.length} saved)
              </p>
            </button>
          </div>
        </div>
      </section>

      {/* Google Sheets Auto-Save Connection Bar */}
      <GoogleSheetsBar sheets={sheets} onOpenInstallGuide={onOpenInstallGuide} />

      {/* Main 2-Zone Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_384px] gap-6 items-start">
        {/* Left Zone: Browser-Window Showcase Frame around Reading Sandbox */}
        <section
          ref={articleRef}
          onMouseUp={handleArticleMouseUp}
          className="relative nesoi-card overflow-visible scroll-mt-20"
          aria-labelledby="sample-article-title"
        >
          {/* Browser Window Top Chrome */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-[#F5F3F0] dark:bg-[#0D1626] border-b border-[#002962]/12 dark:border-[#93C5FD]/15 rounded-t-xl">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              </div>
              <div className="flex-1 bg-white dark:bg-[#111C30] border border-[#002962]/12 dark:border-[#93C5FD]/18 rounded-md px-3 py-1 text-[11.5px] text-[#3B5578] dark:text-[#9FB3CE] font-medium truncate">
                ipmat-cuet-vocab.app · highlight-to-save-reading-passage
              </div>
            </div>
            <label className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#002962] dark:text-[#E8EEF7] bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/22 rounded-md px-2.5 py-1 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={highlighterEnabled}
                onChange={(e) => {
                  setHighlighterEnabled(e.target.checked);
                  if (!e.target.checked) setPeekState(null);
                }}
                className="h-3.5 w-3.5 accent-[#002962] dark:accent-[#3B82F6] cursor-pointer"
              />
              <span>In-Page Highlighter</span>
              <span className="text-[10.5px] font-medium text-[#3B5578] dark:text-[#9FB3CE] tabular-nums">
                ({highlightMatcher.count})
              </span>
            </label>
          </div>

          <div className="p-5 sm:p-7">
            <p className="text-xs font-semibold text-[#3B5578] dark:text-[#9FB3CE] mb-1.5">
              {SAMPLE_ARTICLE.publication}
            </p>
            <h2 id="sample-article-title" className="font-editorial text-xl sm:text-2xl font-semibold text-[#002962] dark:text-[#F1F5F9] tracking-[-0.02em] leading-snug">
              {SAMPLE_ARTICLE.title}
            </h2>
            <p className="mt-1.5 text-[13px] text-[#3B5578] dark:text-[#9FB3CE] pb-4 mb-5 border-b border-[#002962]/12 dark:border-[#93C5FD]/15">
              {SAMPLE_ARTICLE.byline}{' '}
              {highlighterEnabled && highlightMatcher.count > 0 && (
                <span className="text-[#002962] dark:text-[#DCE8FA] font-medium">
                  · Hover dotted highlights (<span className="border-b-2 border-dotted border-[#EA580C] dark:border-[#FB923C]">New</span> /{' '}
                  <span className="border-b-2 border-dotted border-[#0F766E] dark:border-[#2DD4BF]">Learning</span>) to peek meanings.
                </span>
              )}
            </p>

            <div className="article-prose space-y-4 text-[15.5px] leading-[1.74] text-[#1A3459] dark:text-[#CBD5E1] max-w-[68ch]">
              {SAMPLE_ARTICLE.paragraphs.map((para, idx) => (
                <p key={idx} data-sample-para="true">
                  {renderHighlightedParagraph(para)}
                </p>
              ))}
            </div>

            {/* Quick Selection Helpers */}
            <div className="mt-6 pt-4 border-t border-[#002962]/12 dark:border-[#93C5FD]/15 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
              <span className="font-semibold text-[#3B5578] dark:text-[#9FB3CE]">Quick-select to test:</span>
              {QUICK_TEST_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleQuickSelectPhrase(phrase)}
                  className="text-[#002962] dark:text-[#93C5FD] hover:text-[#EA580C] dark:hover:text-[#FB923C] underline underline-offset-4 decoration-[#002962]/30 dark:decoration-[#93C5FD]/35 hover:decoration-[#EA580C] font-semibold cursor-pointer transition-colors whitespace-nowrap"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>

          {/* Floating "Add to Vocab Vault" Button & Confirmation Panel */}
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
                  className="px-4 py-2 bg-[#002962] dark:bg-[#2563EB] text-white text-[13px] font-semibold rounded-md shadow-lg hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#002962] whitespace-nowrap cursor-pointer"
                >
                  Add to Vocab Vault
                </button>
              ) : (
                <div
                  role="dialog"
                  aria-label="Add to Vocab Vault confirmation"
                  className="w-[310px] max-w-[calc(100vw-48px)] bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-xl shadow-xl p-4 text-[#002962] dark:text-[#E8EEF7]"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[#3B5578] dark:text-[#9FB3CE]">IPMAT/CUET VOCAB BUILDER</p>
                      <p className="text-[16px] font-bold text-[#002962] dark:text-[#F1F5F9] leading-snug break-words">
                        {selection.expression}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={hideFloating}
                      aria-label="Close confirmation panel"
                      className="text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white text-lg leading-none px-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>

                  {(panelMode === 'confirm' || panelMode === 'saving') && (
                    <>
                      <p className="text-xs font-medium text-[#3B5578] dark:text-[#9FB3CE] mb-2">
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
                            className={`px-2 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                              selection.category === opt.key
                                ? 'bg-[#002962] dark:bg-[#2563EB] border-[#002962] dark:border-[#2563EB] text-white'
                                : 'bg-white dark:bg-[#0D1626] border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] hover:border-[#002962] dark:hover:border-[#60A5FA]'
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
                          className="px-3.5 py-1.5 text-xs font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleFloatingSave}
                          disabled={panelMode === 'saving'}
                          className="px-4 py-1.5 text-xs font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-60 cursor-pointer"
                        >
                          {panelMode === 'saving' ? 'Analysing…' : 'Save'}
                        </button>
                      </div>
                    </>
                  )}

                  {panelMode === 'result' && savedResult && (
                    <div>
                      <p className="text-xs font-semibold text-[#002962] dark:text-[#93C5FD] mb-2">
                        Saved to {CATEGORIES[savedResult.category]}
                        {savedSheetSync?.synced && savedSheetSync.tabName
                          ? ` · Added to Google Sheet (${savedSheetSync.tabName})`
                          : ''}
                      </p>
                      {savedSheetSync?.attempted && !savedSheetSync.synced && savedSheetSync.error && (
                        <p className="text-[11.5px] text-amber-800 dark:text-amber-300 mb-2">
                          {savedSheetSync.error}
                        </p>
                      )}
                      <p className="text-[13px] text-[#3B5578] dark:text-[#CBD5E1] mb-1.5">
                        <strong className="text-[#002962] dark:text-white">Meaning:</strong> {savedResult.meaning}
                      </p>
                      <p className="text-[13px] text-[#3B5578] dark:text-[#CBD5E1] mb-3.5">
                        <strong className="text-[#002962] dark:text-white">Example:</strong> {savedResult.example}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            hideFloating();
                            onOpenLibrary();
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] cursor-pointer"
                        >
                          Open Library
                        </button>
                        <button
                          type="button"
                          onClick={hideFloating}
                          className="px-4 py-1.5 text-xs font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}

                  {panelMode === 'error' && (
                    <div>
                      <p className="text-[13px] text-red-700 dark:text-red-300 mb-3">{floatError}</p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={hideFloating}
                          className="px-3.5 py-1.5 text-xs font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer"
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

          {/* Hover-to-Peek Meaning Tooltip for In-Page Word Highlighter */}
          {peekState && panelMode === 'hidden' && (
            <div
              role="tooltip"
              data-testid="in-page-peek-tooltip"
              onMouseEnter={cancelPeekHide}
              onMouseLeave={schedulePeekHide}
              style={{ top: peekState.top, left: peekState.left }}
              className="absolute z-30 w-[290px] max-w-[calc(100vw-40px)] bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-xl shadow-xl p-3.5 text-[#002962] dark:text-[#E8EEF7]"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <strong className="text-[14.5px] font-bold text-[#002962] dark:text-[#F1F5F9] leading-snug">
                  {peekState.entry.expression}
                </strong>
                <span
                  className={`text-[10.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
                    getMasteryLevel(peekState.entry) === 'learning'
                      ? 'bg-[#CCFBF1] dark:bg-[#0F766E]/35 text-[#0F766E] dark:text-[#5EEAD4]'
                      : 'bg-[#FFEDD5] dark:bg-[#EA580C]/25 text-[#C2410C] dark:text-[#FDBA74]'
                  }`}
                >
                  {MASTERY_LABELS[getMasteryLevel(peekState.entry)]}
                </span>
              </div>
              <p className="text-[12.5px] text-[#1A3459] dark:text-[#CBD5E1] leading-snug mb-1.5">
                {peekState.entry.meaning}
              </p>
              <p className="text-[11.5px] text-[#3B5578] dark:text-[#9FB3CE] italic leading-snug">
                &ldquo;{peekState.entry.example}&rdquo;
              </p>
            </div>
          )}
        </section>

        {/* Right Zone: Authentic Browser Extension Popup Simulator */}
        <aside aria-label="Browser Extension Popup Preview" className="w-full max-w-[384px] mx-auto lg:mx-0">
          <div className="nesoi-card overflow-hidden">
            {/* Popup Header (Midnight Navy Strip) */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#002962] dark:bg-[#0B162C] text-white border-b border-transparent dark:border-[#93C5FD]/15">
              <span className="text-[13.5px] font-bold tracking-tight truncate pr-2">
                IPMAT/CUET VOCAB BUILDER
              </span>
              <button
                type="button"
                onClick={() => setShowSettingsInfo((v) => !v)}
                className="text-xs font-semibold text-[#DCE8FA] hover:text-white px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                Settings
              </button>
            </div>

            {showSettingsInfo && (
              <div className="px-4 py-3 bg-[#F5F3F0] dark:bg-[#0D1626] border-b border-[#002962]/12 dark:border-[#93C5FD]/15 text-xs text-[#3B5578] dark:text-[#9FB3CE] space-y-1.5">
                <p className="font-semibold text-[#002962] dark:text-[#F1F5F9]">Extension Settings (Browser Local Storage)</p>
                <p>
                  In the downloaded extension (works on Chrome, Brave, Edge, Vivaldi, Opera, Arc &amp; Chromium), Settings opens <code>settings.html</code> where you save your Gemini API key (<strong>Gemini 3.1 Flash Lite</strong>), Apps Script URL, daily goal, and <strong>In-Page Word Highlighter</strong> toggle. Also supports right-click <strong>&ldquo;Save to IPMAT/CUET VOCAB BUILDER&rdquo;</strong> &amp; <code>Alt+Shift+V</code>.
                </p>
                <button
                  type="button"
                  onClick={onOpenInstallGuide}
                  className="text-[#002962] dark:text-[#93C5FD] font-semibold underline cursor-pointer"
                >
                  View Windows &amp; Mac install guide
                </button>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Manual / Bulk Entry Form */}
              <form onSubmit={handlePopupSubmit} className="space-y-2.5" noValidate>
                <label htmlFor="popup-manual-input" className="block text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]">
                  Add word, idiom, or phrasal verb
                </label>
                <textarea
                  id="popup-manual-input"
                  rows={3}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={'Single entry or multiple separated by commas or new lines\ne.g. aberration, break the ice, put off'}
                  className="w-full px-3 py-2 text-[13px] border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] placeholder:text-[#5E7494] dark:placeholder:text-[#7C95B6] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-[#002962]/10 dark:focus:ring-[#60A5FA]/20 resize-y"
                />

                <div className="flex items-center gap-2">
                  <label htmlFor="popup-category-select" className="sr-only">
                    Category
                  </label>
                  <select
                    id="popup-category-select"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as 'auto' | Category)}
                    className="flex-1 h-9 px-3 text-[12.5px] font-medium border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="vocabulary">Vocabulary</option>
                    <option value="idioms">Idioms</option>
                    <option value="phrasalVerbs">Phrasal Verbs</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isPopupBusy}
                    className="h-9 px-4 text-[12.5px] font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-60 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {isPopupBusy ? 'Analysing…' : 'Save and Analyse'}
                  </button>
                </div>
              </form>

              {popupStatus && (
                <div
                  aria-live="polite"
                  className={`p-3 rounded-lg border text-xs ${
                    popupStatus.tone === 'error'
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200'
                      : popupStatus.tone === 'success'
                      ? 'bg-[#EEF3F9] dark:bg-[#172540] border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7]'
                      : 'bg-[#F5F3F0] dark:bg-[#0D1626] border-[#002962]/15 dark:border-[#93C5FD]/20 text-[#002962] dark:text-[#E8EEF7]'
                  }`}
                >
                  <p className="font-semibold">{popupStatus.summary}</p>
                  {popupStatus.details.length > 0 && (
                    <ul className="mt-1.5 pl-4 list-disc space-y-0.5 max-h-24 overflow-y-auto">
                      {popupStatus.details.map((d, idx) => (
                        <li
                          key={idx}
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

              {/* Tabular Counts Strip */}
              <div className="flex items-center justify-between py-2.5 px-2 rounded-lg bg-[#F5F3F0] dark:bg-[#0D1626] border border-[#002962]/12 dark:border-[#93C5FD]/15">
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-[#002962] dark:text-[#F1F5F9] tabular-nums leading-tight" data-testid="popup-count-vocabulary">
                    {counts.vocabulary}
                  </div>
                  <div className="text-[11.5px] font-medium text-[#3B5578] dark:text-[#9FB3CE]">Vocabulary</div>
                </div>
                <div className="w-px h-7 bg-[#002962]/12 dark:bg-[#93C5FD]/18" aria-hidden="true" />
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-[#002962] dark:text-[#F1F5F9] tabular-nums leading-tight" data-testid="popup-count-idioms">
                    {counts.idioms}
                  </div>
                  <div className="text-[11.5px] font-medium text-[#3B5578] dark:text-[#9FB3CE]">Idioms</div>
                </div>
                <div className="w-px h-7 bg-[#002962]/12 dark:bg-[#93C5FD]/18" aria-hidden="true" />
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold text-[#002962] dark:text-[#F1F5F9] tabular-nums leading-tight" data-testid="popup-count-phrasal">
                    {counts.phrasalVerbs}
                  </div>
                  <div className="text-[11.5px] font-medium text-[#3B5578] dark:text-[#9FB3CE]">Phrasal Verbs</div>
                </div>
              </div>

              {/* Recently Saved */}
              <div>
                <h3 className="text-xs font-semibold text-[#3B5578] dark:text-[#9FB3CE] mb-1.5">Recently Saved</h3>
                {recentEntries.length === 0 ? (
                  <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] py-1">No entries saved yet.</p>
                ) : (
                  <div className="divide-y divide-[#002962]/10 dark:divide-[#93C5FD]/12 max-h-44 overflow-y-auto">
                    {recentEntries.map((item) => (
                      <div key={item.id} className="py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-bold text-[#002962] dark:text-[#F1F5F9]">
                            {item.expression}
                          </span>
                          <span className="text-[11px] font-medium text-[#3B5578] dark:text-[#9FB3CE] whitespace-nowrap">
                            {CATEGORIES[item.category]}
                          </span>
                        </div>
                        <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] line-clamp-2 mt-0.5">{item.meaning}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Popup Footer */}
            <div className="px-4 py-3 bg-[#F5F3F0] dark:bg-[#0D1626] border-t border-[#002962]/12 dark:border-[#93C5FD]/15">
              <button
                type="button"
                onClick={onOpenLibrary}
                className="w-full h-9 text-[13px] font-semibold bg-[#EEF3F9] dark:bg-[#172540] hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] transition-colors cursor-pointer"
              >
                Open THE VOCAB VAULT
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
