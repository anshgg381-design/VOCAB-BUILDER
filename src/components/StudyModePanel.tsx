import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCw, Volume2 } from 'lucide-react';
import { canSpeakExpression, speakExpression } from '../utils/speech';
import {
  CATEGORIES,
  CATEGORY_SINGULAR,
  MASTERY_LABELS,
  StudyOutcome,
  StudyScope,
  VocabEntry,
  buildStudyDeck,
  getCategoryCounts,
  getDailyReviewQueue,
  getEntryReviewSchedule,
  getMasteryLevel,
  getStudyMasteryForOutcome,
  previewReviewIntervals,
} from '../utils/vocabLogic';

interface StudyModePanelProps {
  entries: VocabEntry[];
  initialScope?: StudyScope;
  onRateEntry: (id: string, outcome: StudyOutcome) => void;
  onExit: () => void;
}

function shuffleList<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const StudyModePanel: React.FC<StudyModePanelProps> = ({
  entries,
  initialScope = 'all',
  onRateEntry,
  onExit,
}) => {
  const [scope, setScope] = useState<StudyScope>(initialScope);
  const [deckIds, setDeckIds] = useState<string[]>(() =>
    buildStudyDeck(entries, initialScope).map((e) => e.id)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<string[]>([]);
  const [needsReviewIds, setNeedsReviewIds] = useState<string[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isMissedRound, setIsMissedRound] = useState(false);

  const entriesById = useMemo(() => {
    const map = new Map<string, VocabEntry>();
    for (const e of entries) map.set(e.id, e);
    return map;
  }, [entries]);

  const counts = useMemo(() => getCategoryCounts(entries), [entries]);
  const reviewQueue = useMemo(() => getDailyReviewQueue(entries), [entries]);
  const needsReviewTotal = useMemo(
    () => entries.filter((e) => getMasteryLevel(e) !== 'mastered').length,
    [entries]
  );

  // Resolve active deck entries (dropping any that might have been deleted)
  const deckEntries = useMemo(
    () => deckIds.map((id) => entriesById.get(id)).filter((e): e is VocabEntry => Boolean(e)),
    [deckIds, entriesById]
  );

  const currentCard = !isSessionComplete ? deckEntries[currentIndex] || null : null;

  const startSessionWithIds = useCallback((ids: string[], missedOnly = false) => {
    setDeckIds(ids);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownIds([]);
    setNeedsReviewIds([]);
    setIsSessionComplete(false);
    setIsMissedRound(missedOnly);
  }, []);

  const handleScopeChange = (nextScope: StudyScope) => {
    setScope(nextScope);
    const nextDeck = buildStudyDeck(entries, nextScope).map((e) => e.id);
    startSessionWithIds(nextDeck, false);
  };

  const handleShuffle = () => {
    const baseIds =
      deckEntries.length > 0
        ? deckEntries.map((e) => e.id)
        : buildStudyDeck(entries, scope).map((e) => e.id);
    startSessionWithIds(shuffleList(baseIds), isMissedRound);
  };

  const handleRate = useCallback(
    (outcome: StudyOutcome) => {
      if (!currentCard || !isFlipped) return;

      onRateEntry(currentCard.id, outcome);

      if (outcome === 'known') {
        setKnownIds((prev) => (prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]));
      } else {
        setNeedsReviewIds((prev) =>
          prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]
        );
      }

      if (currentIndex + 1 >= deckEntries.length) {
        setIsSessionComplete(true);
        setIsFlipped(false);
      } else {
        setCurrentIndex((i) => i + 1);
        setIsFlipped(false);
      }
    },
    [currentCard, isFlipped, currentIndex, deckEntries.length, onRateEntry]
  );

  // Keyboard shortcuts: Space/Enter flips; 1 = Needs Review, 2 = Known once flipped
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      if (isSessionComplete || !currentCard) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped && e.key === '1') {
        e.preventDefault();
        handleRate('needsReview');
      } else if (isFlipped && e.key === '2') {
        e.preventDefault();
        handleRate('known');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentCard, isFlipped, isSessionComplete, handleRate]);

  const studiedCount = knownIds.length + needsReviewIds.length;
  const sessionProgressPct =
    deckEntries.length > 0
      ? Math.round(((isSessionComplete ? deckEntries.length : studiedCount) / deckEntries.length) * 100)
      : 0;

  return (
    <section
      aria-label="Flashcard Study Mode"
      className="nesoi-card p-5 sm:p-6 space-y-6"
    >
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#002962]/12 dark:border-[#94B3DB]/18">
        <div className="space-y-0.5">
          <h2 className="font-editorial text-2xl font-semibold tracking-[-0.02em] text-[#002962] dark:text-[#E8EEF7]">
            Study Mode{isMissedRound ? ' · Missed Cards' : scope === 'dailyReview' ? ' · Due Today' : ''}
          </h2>
          <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE]">
            Test your recall first, then flip the card. Spaced repetition schedules your next review automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="study-deck-select" className="sr-only">
            Study deck
          </label>
          <select
            id="study-deck-select"
            value={scope}
            onChange={(e) => handleScopeChange(e.target.value as StudyScope)}
            className="h-9 px-3.5 text-[13px] font-medium border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md bg-white dark:bg-[#0B1220] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
          >
            <option value="dailyReview">Due Today ({reviewQueue.totalDue})</option>
            <option value="all">All Collections ({counts.total})</option>
            <option value="needsReview">Needs Review ({needsReviewTotal})</option>
            <option value="vocabulary">Vocabulary ({counts.vocabulary})</option>
            <option value="idioms">Idioms ({counts.idioms})</option>
            <option value="phrasalVerbs">Phrasal Verbs ({counts.phrasalVerbs})</option>
          </select>

          {deckEntries.length > 1 && (
            <button
              type="button"
              onClick={handleShuffle}
              className="h-9 px-3.5 text-[13px] font-semibold bg-[#EEF3F9] dark:bg-[#1B2B45] border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#E1EAF5] dark:hover:bg-[#24385A] cursor-pointer"
            >
              Shuffle
            </button>
          )}

          <button
            type="button"
            onClick={onExit}
            className="h-9 px-4 text-[13px] font-semibold bg-white dark:bg-[#17253D] border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#1F3150] cursor-pointer"
          >
            Exit Study Mode
          </button>
        </div>
      </div>

      {/* Empty Deck State */}
      {deckEntries.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-base font-bold text-[#002962] dark:text-[#E8EEF7]">
            {scope === 'dailyReview'
              ? 'All spaced-repetition reviews for today are complete'
              : scope === 'needsReview'
              ? 'All saved entries are mastered'
              : 'No cards available in this deck'}
          </p>
          <p className="text-sm text-[#3B5578] dark:text-[#9FB3CE] max-w-md mx-auto">
            {scope === 'dailyReview'
              ? reviewQueue.nextUpcomingItem
                ? `Next scheduled review: "${reviewQueue.nextUpcomingItem.entry.expression}" (${reviewQueue.nextUpcomingItem.schedule.scheduleLabel}). Switch to All Collections to revise ahead.`
                : 'Switch to All Collections to revise everything again.'
              : scope === 'needsReview'
              ? 'Every entry in your library is currently marked Mastered. Switch to All Collections to revise everything again.'
              : 'Choose another collection above or add entries to your library first.'}
          </p>
          {scope !== 'all' && entries.length > 0 && (
            <button
              type="button"
              onClick={() => handleScopeChange('all')}
              className="mt-2 h-9 px-5 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer"
            >
              Study All Collections ({entries.length})
            </button>
          )}
        </div>
      ) : isSessionComplete ? (
        /* End-of-Session Summary */
        <div className="max-w-[540px] mx-auto py-8 text-center space-y-6" data-testid="study-summary">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#EA580C] dark:text-[#FB923C]">
              Session Complete
            </p>
            <h3 className="font-editorial text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#002962] dark:text-[#E8EEF7]">
              Reviewed {deckEntries.length} {deckEntries.length === 1 ? 'card' : 'cards'}
            </h3>
            <p className="text-sm text-[#3B5578] dark:text-[#9FB3CE]">
              Your Mastery Levels and Spaced Repetition schedules have been updated in THE VOCAB VAULT.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-xl p-5 bg-[#EEF3F9] dark:bg-[#17253D]">
              <div
                className="text-3xl font-bold text-[#002962] dark:text-[#E8EEF7] tabular-nums"
                data-testid="study-known-count"
              >
                {knownIds.length}
              </div>
              <div className="text-xs font-semibold text-[#002962] dark:text-[#93C5FD] mt-1">Known (Mastered)</div>
            </div>
            <div className="border border-[#EA580C]/25 dark:border-[#FB923C]/30 rounded-xl p-5 bg-[#FAF0E4] dark:bg-[#2C1B14]">
              <div
                className="text-3xl font-bold text-[#C2410C] dark:text-[#FB923C] tabular-nums"
                data-testid="study-review-count"
              >
                {needsReviewIds.length}
              </div>
              <div className="text-xs font-semibold text-[#9A3412] dark:text-[#FDBA74] mt-1">
                Needs Review (Learning)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {needsReviewIds.length > 0 && (
              <button
                type="button"
                onClick={() => startSessionWithIds([...needsReviewIds], true)}
                className="h-10 px-5 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer"
              >
                Review Missed Cards ({needsReviewIds.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => startSessionWithIds(buildStudyDeck(entries, scope).map((e) => e.id), false)}
              className="h-10 px-5 text-sm font-semibold bg-[#EEF3F9] dark:bg-[#1B2B45] border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#E1EAF5] dark:hover:bg-[#24385A] cursor-pointer"
            >
              Study Again
            </button>
            <button
              type="button"
              onClick={onExit}
              className="h-10 px-5 text-sm font-semibold bg-white dark:bg-[#17253D] border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#1F3150] cursor-pointer"
            >
              Back to Library
            </button>
          </div>
        </div>
      ) : currentCard ? (
        /* Active Flashcard Stage */
        <div className="max-w-[660px] mx-auto space-y-4">
          {/* Card Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#3B5578] dark:text-[#9FB3CE] tabular-nums">
              <span className="font-semibold text-[#002962] dark:text-[#E8EEF7]" data-testid="study-card-counter">
                Card {currentIndex + 1} of {deckEntries.length}
              </span>
              <span>
                {knownIds.length} known · {needsReviewIds.length} needs review
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Study session progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={sessionProgressPct}
              className="h-1.5 w-full bg-[#EAE7E1] dark:bg-[#1E2E4A] rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-[#002962] dark:bg-[#3B82F6] transition-all duration-200 rounded-full"
                style={{ width: `${sessionProgressPct}%` }}
              />
            </div>
          </div>

          {/* 3D Flippable Flashcard Surface */}
          <div
            key={currentCard.id}
            className="flashcard-scene flashcard-enter"
            data-testid="study-flashcard"
            data-flipped={isFlipped ? 'true' : 'false'}
          >
            <div className={`flashcard-3d-inner ${isFlipped ? 'is-flipped' : ''}`}>
              {/* Front Face */}
              <div
                aria-hidden={isFlipped}
                onClick={(e) => {
                  if (isFlipped) return;
                  if ((e.target as HTMLElement).closest('button')) return;
                  setIsFlipped(true);
                }}
                className={`flashcard-face flashcard-face-front nesoi-navy-panel text-white rounded-xl p-6 sm:p-8 min-h-[310px] flex flex-col justify-between shadow-md border border-[#002962] dark:border-[#94B3DB]/25 ${
                  isFlipped ? 'pointer-events-none select-none' : 'cursor-pointer'
                }`}
              >
                {/* Card Metadata Header */}
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.08em]">
                  <span className="font-bold text-[#FDBA74]">
                    {MASTERY_LABELS[getMasteryLevel(currentCard)]} · {getEntryReviewSchedule(currentCard).scheduleLabel}
                  </span>
                  <span className="font-medium text-[#DCE8FA]/85">
                    {CATEGORY_SINGULAR[currentCard.category]} · {CATEGORIES[currentCard.category]}
                  </span>
                </div>

                {/* Card Center Content */}
                <div className="py-8 text-center space-y-3">
                  <h3
                    className="font-editorial text-3xl sm:text-[42px] font-light tracking-[-0.025em] text-white leading-tight"
                    data-testid="study-card-expression"
                  >
                    {currentCard.expression}
                  </h3>
                  <p className="text-sm text-[#DCE8FA]/85">
                    Recall the meaning and how to use it in a sentence.
                  </p>
                  {canSpeakExpression() && (
                    <button
                      type="button"
                      tabIndex={isFlipped ? -1 : 0}
                      onClick={() => speakExpression(currentCard.expression)}
                      aria-label={`Pronounce ${currentCard.expression}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-md transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Listen
                    </button>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-[#DCE8FA]/80">
                    Click card or press Space to flip and check your answer.
                  </p>
                  <button
                    type="button"
                    tabIndex={isFlipped ? -1 : 0}
                    onClick={() => setIsFlipped(true)}
                    className="h-10 px-6 inline-flex items-center justify-center gap-2 text-sm font-bold bg-white text-[#002962] rounded-md hover:bg-[#EEF3F9] cursor-pointer transition-colors self-start sm:self-auto"
                  >
                    <RotateCw className="w-4 h-4" aria-hidden="true" />
                    Flip Card
                  </button>
                </div>
              </div>

              {/* Back Face */}
              <div
                aria-hidden={!isFlipped}
                data-testid="study-card-back"
                className={`flashcard-face flashcard-face-back bg-white dark:bg-[#16233B] border-2 border-[#002962]/25 dark:border-[#94B3DB]/30 rounded-xl p-6 sm:p-8 min-h-[310px] flex flex-col justify-between shadow-sm ${
                  !isFlipped ? 'pointer-events-none select-none' : ''
                }`}
              >
                {/* Card Metadata Header */}
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.08em] text-[#3B5578] dark:text-[#9FB3CE]">
                  <span className="font-semibold text-[#002962] dark:text-[#E8EEF7]">
                    {CATEGORY_SINGULAR[currentCard.category]} · {CATEGORIES[currentCard.category]}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {MASTERY_LABELS[getMasteryLevel(currentCard)]}
                  </span>
                </div>

                <div className="py-4 space-y-4">
                  <div className="flex items-baseline justify-between gap-3 pb-3 border-b border-[#002962]/12 dark:border-[#94B3DB]/18">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3
                        className="font-editorial text-2xl sm:text-[30px] font-semibold tracking-[-0.02em] text-[#002962] dark:text-[#E8EEF7]"
                        data-testid="study-card-back-expression"
                      >
                        {currentCard.expression}
                      </h3>
                      {canSpeakExpression() && (
                        <button
                          type="button"
                          tabIndex={isFlipped ? 0 : -1}
                          onClick={() => speakExpression(currentCard.expression)}
                          aria-label={`Pronounce ${currentCard.expression}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#EEF3F9] dark:bg-[#1E3050] border border-[#002962]/20 dark:border-[#94B3DB]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#273E66] cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Listen
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      tabIndex={isFlipped ? 0 : -1}
                      onClick={() => setIsFlipped(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white hover:underline shrink-0 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                      Hide Meaning
                    </button>
                  </div>

                  <div className="space-y-3 text-[15px] leading-relaxed text-[#1A3459] dark:text-[#D1DFEE]">
                    <p data-testid="study-card-meaning">
                      <strong className="font-bold text-[#002962] dark:text-white">Meaning: </strong>
                      {currentCard.meaning}
                    </p>
                    <p
                      data-testid="study-card-example"
                      className="bg-[#F5F3F0] dark:bg-[#0E182B] border border-[#002962]/12 dark:border-[#94B3DB]/18 rounded-lg px-4 py-3 text-[14.5px]"
                    >
                      <strong className="font-bold text-[#002962] dark:text-white">Example: </strong>
                      {currentCard.example}
                    </p>
                  </div>
                </div>

                {/* Card Footer Actions */}
                {(() => {
                  const intervals = previewReviewIntervals(currentCard);
                  return (
                    <div className="pt-4 border-t border-[#002962]/12 dark:border-[#94B3DB]/18 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE]">
                        How well did you recall this?
                      </p>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          tabIndex={isFlipped ? 0 : -1}
                          onClick={() => handleRate('needsReview')}
                          className="flex-1 sm:flex-none h-10 px-5 text-sm font-semibold border border-[#EA580C]/35 dark:border-[#FB923C]/40 bg-[#FAF0E4] dark:bg-[#331E15] text-[#9A3412] dark:text-[#FDBA74] rounded-md hover:bg-[#F5E4CF] dark:hover:bg-[#42271B] cursor-pointer transition-colors whitespace-nowrap"
                        >
                          Needs Review (1d)
                        </button>
                        <button
                          type="button"
                          tabIndex={isFlipped ? 0 : -1}
                          onClick={() => handleRate('known')}
                          className="flex-1 sm:flex-none h-10 px-6 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer transition-colors whitespace-nowrap"
                        >
                          Known ({intervals.masteredDays}d)
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-[#3B5578] dark:text-[#9FB3CE]">
            Shortcuts: <span className="font-semibold text-[#002962] dark:text-[#E8EEF7]">Space</span> to flip ·{' '}
            <span className="font-semibold text-[#002962] dark:text-[#E8EEF7]">1</span> Needs Review (
            {MASTERY_LABELS[getStudyMasteryForOutcome('needsReview')]}) ·{' '}
            <span className="font-semibold text-[#002962] dark:text-[#E8EEF7]">2</span> Known (
            {MASTERY_LABELS[getStudyMasteryForOutcome('known')]})
          </p>
        </div>
      ) : null}
    </section>
  );
};
