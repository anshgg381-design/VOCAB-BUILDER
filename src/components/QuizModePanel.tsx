import React, { useMemo, useState } from 'react';
import {
  CATEGORIES,
  CATEGORY_SINGULAR,
  MASTERY_LABELS,
  QUIZ_MAX_QUESTIONS,
  QUIZ_MIN_QUESTIONS,
  QuizQuestion,
  VocabEntry,
  generateQuizQuestions,
  getMasteryLevel,
  getQuizEligibleEntries,
} from '../utils/vocabLogic';

interface QuizModePanelProps {
  entries: VocabEntry[];
  onMarkEntriesMastered: (ids: string[]) => void;
  onRecordQuizMiss?: (entryId: string) => void;
  onExit: () => void;
}

interface AnswerRecord {
  question: QuizQuestion;
  selectedIndex: number;
  isCorrect: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const QuizModePanel: React.FC<QuizModePanelProps> = ({
  entries,
  onMarkEntriesMastered,
  onRecordQuizMiss,
  onExit,
}) => {
  const eligibleEntries = useMemo(() => getQuizEligibleEntries(entries), [entries]);
  const maxSelectable = Math.min(QUIZ_MAX_QUESTIONS, eligibleEntries.length);

  // Setup state
  const [selectionMode, setSelectionMode] = useState<'random' | 'custom'>('random');
  const [questionCount, setQuestionCount] = useState<number>(() =>
    Math.max(QUIZ_MIN_QUESTIONS, Math.min(10, Math.max(QUIZ_MIN_QUESTIONS, eligibleEntries.length)))
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [setupError, setSetupError] = useState('');

  // Active quiz state
  const [phase, setPhase] = useState<'setup' | 'active' | 'results'>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chosenOption, setChosenOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [promotedMastered, setPromotedMastered] = useState(false);

  const clampedRandomCount = Math.max(
    QUIZ_MIN_QUESTIONS,
    Math.min(Math.max(QUIZ_MIN_QUESTIONS, maxSelectable), questionCount)
  );

  const filteredEligible = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return eligibleEntries;
    return eligibleEntries.filter(
      (e) =>
        e.expression.toLowerCase().includes(q) ||
        CATEGORIES[e.category].toLowerCase().includes(q)
    );
  }, [eligibleEntries, pickerSearch]);

  const toggleWordSelection = (id: string) => {
    setSetupError('');
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= QUIZ_MAX_QUESTIONS) {
        setSetupError(`You can select at most ${QUIZ_MAX_QUESTIONS} words per quiz.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleStartQuiz = () => {
    setSetupError('');
    const result = generateQuizQuestions(entries, {
      mode: selectionMode,
      count: clampedRandomCount,
      selectedIds,
    });
    if (!result.ok) {
      setSetupError(result.error);
      return;
    }
    setQuestions(result.questions);
    setCurrentIndex(0);
    setChosenOption(null);
    setAnswers([]);
    setPromotedMastered(false);
    setPhase('active');
  };

  const handleChooseOption = (optionIndex: number) => {
    if (chosenOption !== null) return;
    const q = questions[currentIndex];
    if (!q) return;
    const isCorrect = optionIndex === q.correctIndex;
    setChosenOption(optionIndex);
    if (!isCorrect && onRecordQuizMiss) {
      onRecordQuizMiss(q.entryId);
    }
    setAnswers((prev) => [
      ...prev,
      {
        question: q,
        selectedIndex: optionIndex,
        isCorrect,
      },
    ]);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('results');
    } else {
      setCurrentIndex((i) => i + 1);
      setChosenOption(null);
    }
  };

  const handleResetToSetup = () => {
    setPhase('setup');
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setChosenOption(null);
    setSetupError('');
    setPromotedMastered(false);
  };

  const correctAnswers = answers.filter((a) => a.isCorrect);
  const currentQuestion = questions[currentIndex];
  const scorePct =
    questions.length > 0 ? Math.round((correctAnswers.length / questions.length) * 100) : 0;

  return (
    <section
      aria-label="Multiple-Choice Quiz Mode"
      className="nesoi-card p-5 sm:p-6 space-y-5"
    >
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#002962]/12 dark:border-[#94B3DB]/18">
        <div className="space-y-0.5">
          <h2 className="font-editorial text-2xl font-semibold tracking-[-0.02em] text-[#002962] dark:text-[#E8EEF7]">
            Quiz Mode
          </h2>
          <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE]">
            Multiple-choice recall quiz ({QUIZ_MIN_QUESTIONS}–{QUIZ_MAX_QUESTIONS} questions). Missed answers are tracked automatically in Needs Practice.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {phase !== 'setup' && (
            <button
              type="button"
              onClick={handleResetToSetup}
              className="h-9 px-4 text-[13px] font-semibold bg-[#EEF3F9] dark:bg-[#1B2B45] border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#E1EAF5] dark:hover:bg-[#24385A] cursor-pointer"
            >
              Quiz Setup
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="h-9 px-4 text-[13px] font-semibold bg-white dark:bg-[#17253D] border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#1F3150] cursor-pointer"
          >
            Exit Quiz Mode
          </button>
        </div>
      </div>

      {/* Phase 1: Setup */}
      {phase === 'setup' && (
        <div className="max-w-[680px] mx-auto space-y-5" data-testid="quiz-setup">
          {eligibleEntries.length < QUIZ_MIN_QUESTIONS ? (
            <div className="py-10 text-center space-y-3 border border-[#002962]/12 dark:border-[#94B3DB]/18 rounded-xl bg-[#F5F3F0] dark:bg-[#0E182B] px-6">
              <p className="text-base font-bold text-[#002962] dark:text-[#E8EEF7]">
                Add at least {QUIZ_MIN_QUESTIONS} New or Learning entries to take a quiz
              </p>
              <p className="text-sm text-[#3B5578] dark:text-[#9FB3CE] max-w-md mx-auto">
                You currently have{' '}
                <strong className="font-semibold text-[#002962] dark:text-white">{eligibleEntries.length}</strong>{' '}
                eligible {eligibleEntries.length === 1 ? 'entry' : 'entries'}. Save a few more
                expressions or change existing Mastered entries back to Learning.
              </p>
              <button
                type="button"
                onClick={onExit}
                className="mt-1 h-9 px-5 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer"
              >
                Back to Library
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#002962] dark:text-[#E8EEF7]">Word Selection</p>
                  <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] tabular-nums" data-testid="quiz-eligible-count">
                    {eligibleEntries.length} eligible New &amp; Learning entries available
                  </p>
                </div>

                {/* Architectural Segmented Switcher */}
                <div
                  role="group"
                  aria-label="Quiz word source"
                  className="inline-flex items-center p-1 rounded-lg bg-[#EAE7E1] dark:bg-[#1B2B45] border border-[#002962]/10 dark:border-[#94B3DB]/20 self-start"
                >
                  <button
                    type="button"
                    aria-pressed={selectionMode === 'random'}
                    onClick={() => {
                      setSelectionMode('random');
                      setSetupError('');
                    }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                      selectionMode === 'random'
                        ? 'bg-[#002962] dark:bg-[#2563EB] text-white shadow-sm'
                        : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
                    }`}
                  >
                    Random Words
                  </button>
                  <button
                    type="button"
                    aria-pressed={selectionMode === 'custom'}
                    onClick={() => {
                      setSelectionMode('custom');
                      setSetupError('');
                    }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                      selectionMode === 'custom'
                        ? 'bg-[#002962] dark:bg-[#2563EB] text-white shadow-sm'
                        : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
                    }`}
                  >
                    Select Words
                  </button>
                </div>
              </div>

              {selectionMode === 'random' ? (
                <div className="border border-[#002962]/12 dark:border-[#94B3DB]/18 rounded-xl p-5 bg-[#F5F3F0] dark:bg-[#0E182B] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="quiz-count-range"
                      className="text-sm font-bold text-[#002962] dark:text-[#E8EEF7]"
                    >
                      Number of Questions
                    </label>
                    <span
                      className="text-sm font-bold text-[#002962] dark:text-[#E8EEF7] tabular-nums"
                      data-testid="quiz-count-value"
                    >
                      {clampedRandomCount} questions
                    </span>
                  </div>

                  <input
                    id="quiz-count-range"
                    type="range"
                    min={QUIZ_MIN_QUESTIONS}
                    max={maxSelectable}
                    value={clampedRandomCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    disabled={maxSelectable <= QUIZ_MIN_QUESTIONS}
                    className="w-full accent-[#002962] dark:accent-[#3B82F6] cursor-pointer"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {[5, 10, 15, 20].map((preset) => {
                        const disabled = preset > maxSelectable;
                        const active = clampedRandomCount === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            disabled={disabled}
                            onClick={() => setQuestionCount(preset)}
                            className={`h-8 px-3.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              active
                                ? 'bg-[#002962] dark:bg-[#2563EB] border-[#002962] dark:border-[#2563EB] text-white'
                                : 'bg-white dark:bg-[#17253D] border-[#002962]/20 dark:border-[#94B3DB]/25 text-[#002962] dark:text-[#E8EEF7] hover:border-[#002962] dark:hover:border-[#60A5FA]'
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs text-[#3B5578] dark:text-[#9FB3CE] tabular-nums">
                      Min {QUIZ_MIN_QUESTIONS} · Max {maxSelectable}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border border-[#002962]/12 dark:border-[#94B3DB]/18 rounded-xl p-4 bg-[#F5F3F0] dark:bg-[#0E182B] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="text-xs font-semibold text-[#002962] dark:text-[#E8EEF7] tabular-nums"
                      data-testid="quiz-selected-counter"
                    >
                      Selected: {selectedIds.length} / {maxSelectable} (min {QUIZ_MIN_QUESTIONS})
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIds(
                            eligibleEntries.slice(0, Math.min(QUIZ_MIN_QUESTIONS, maxSelectable)).map((e) => e.id)
                          );
                          setSetupError('');
                        }}
                        className="font-semibold text-[#002962] dark:text-[#93C5FD] hover:underline cursor-pointer"
                      >
                        Quick-select {QUIZ_MIN_QUESTIONS}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIds(eligibleEntries.slice(0, maxSelectable).map((e) => e.id));
                          setSetupError('');
                        }}
                        className="font-medium text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white hover:underline cursor-pointer"
                      >
                        Select all ({maxSelectable})
                      </button>
                      {selectedIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIds([]);
                            setSetupError('');
                          }}
                          className="font-medium text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Filter eligible words…"
                    aria-label="Filter eligible quiz words"
                    className="w-full h-9 px-3.5 text-sm border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md bg-white dark:bg-[#111C30] text-[#002962] dark:text-[#E8EEF7] placeholder:text-[#5E7494] dark:placeholder:text-[#7E96B8] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
                  />

                  <div className="max-h-56 overflow-y-auto divide-y divide-[#002962]/10 dark:divide-[#94B3DB]/15 bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#94B3DB]/20 rounded-lg">
                    {filteredEligible.length === 0 ? (
                      <p className="p-4 text-xs text-[#3B5578] dark:text-[#9FB3CE] text-center">No matching entries.</p>
                    ) : (
                      filteredEligible.map((entry) => {
                        const checked = selectedIds.includes(entry.id);
                        const atLimit = !checked && selectedIds.length >= QUIZ_MAX_QUESTIONS;
                        const level = getMasteryLevel(entry);
                        return (
                          <label
                            key={entry.id}
                            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm cursor-pointer ${
                              checked ? 'bg-[#EEF3F9] dark:bg-[#1B2B45]' : 'hover:bg-[#F5F3F0] dark:hover:bg-[#17253D]'
                            } ${atLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={atLimit}
                                onChange={() => toggleWordSelection(entry.id)}
                                className="h-4 w-4 accent-[#002962] dark:accent-[#3B82F6] rounded cursor-pointer"
                              />
                              <span className="font-semibold text-[#002962] dark:text-[#E8EEF7] truncate">
                                {entry.expression}
                              </span>
                            </span>
                            <span className="text-xs text-[#3B5578] dark:text-[#9FB3CE] shrink-0">
                              {CATEGORIES[entry.category]} ·{' '}
                              <span
                                className={
                                  level === 'learning'
                                    ? 'text-[#EA580C] dark:text-[#FB923C] font-medium'
                                    : 'text-[#3B5578] dark:text-[#9FB3CE]'
                                }
                              >
                                {MASTERY_LABELS[level]}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {setupError && (
                <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
                  {setupError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="h-10 px-6 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer transition-colors"
                >
                  Start Quiz (
                  {selectionMode === 'random'
                    ? clampedRandomCount
                    : selectedIds.length}{' '}
                  {selectionMode === 'custom' && selectedIds.length === 1
                    ? 'question'
                    : 'questions'}
                  )
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Phase 2: Active Question */}
      {phase === 'active' && currentQuestion && (
        <div className="max-w-[660px] mx-auto space-y-3.5" data-testid="quiz-active">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#3B5578] dark:text-[#9FB3CE] tabular-nums">
              <span data-testid="quiz-question-counter">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span data-testid="quiz-live-score">
                Score: {correctAnswers.length} / {answers.length}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((answers.length / questions.length) * 100)}
              className="h-1.5 w-full bg-[#EAE7E1] dark:bg-[#1E2E4A] rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-[#002962] dark:bg-[#3B82F6] transition-all duration-200 rounded-full"
                style={{ width: `${Math.round((answers.length / questions.length) * 100)}%` }}
              />
            </div>
          </div>

          <div className="border border-[#002962]/12 dark:border-[#94B3DB]/18 rounded-xl bg-[#F5F3F0] dark:bg-[#0E182B] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-[#3B5578] dark:text-[#9FB3CE]">
              <span className="font-semibold text-[#002962] dark:text-[#E8EEF7]">
                {CATEGORY_SINGULAR[currentQuestion.category]} ·{' '}
                {CATEGORIES[currentQuestion.category]}
              </span>
              <span className="font-medium">{MASTERY_LABELS[currentQuestion.masteryLevel]}</span>
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-medium text-[#3B5578] dark:text-[#9FB3CE]">
                Choose the best meaning for:
              </p>
              <h3
                className="font-editorial text-2xl sm:text-[32px] font-semibold tracking-[-0.02em] text-[#002962] dark:text-white"
                data-testid="quiz-question-expression"
              >
                {currentQuestion.expression}
              </h3>
            </div>

            <div className="space-y-2" role="group" aria-label="Answer options">
              {currentQuestion.options.map((optionText, idx) => {
                const answered = chosenOption !== null;
                const isSelected = chosenOption === idx;
                const isCorrect = idx === currentQuestion.correctIndex;

                let stateClasses =
                  'bg-white dark:bg-[#16233B] border border-[#002962]/20 dark:border-[#94B3DB]/25 text-[#002962] dark:text-[#E8EEF7] hover:border-[#002962] dark:hover:border-[#60A5FA] hover:bg-[#EEF3F9]/60 dark:hover:bg-[#1E3050]';
                if (answered) {
                  if (isCorrect) {
                    stateClasses = 'bg-[#EEF3F9] dark:bg-[#1A3359] border-2 border-[#002962] dark:border-[#60A5FA] text-[#002962] dark:text-white font-semibold';
                  } else if (isSelected && !isCorrect) {
                    stateClasses = 'bg-red-50 dark:bg-red-950/50 border-2 border-red-500 dark:border-red-400 text-red-900 dark:text-red-200 font-semibold';
                  } else {
                    stateClasses = 'bg-white dark:bg-[#111C30] border border-[#002962]/12 dark:border-[#94B3DB]/15 text-[#5E7494] dark:text-[#7E96B8]';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={answered}
                    onClick={() => handleChooseOption(idx)}
                    data-testid={`quiz-option-${idx}`}
                    data-correct={isCorrect ? 'true' : 'false'}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm flex items-start justify-between gap-3 ${
                      answered ? 'cursor-default' : 'cursor-pointer transition-colors'
                    } ${stateClasses}`}
                  >
                    <span className="flex items-start gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-bold mt-0.5 shrink-0 w-5 text-[#002962] dark:text-[#93C5FD]">
                        {OPTION_LETTERS[idx]}.
                      </span>
                      <span className="leading-snug">{optionText}</span>
                    </span>
                    {answered && isCorrect && (
                      <span className="text-[11px] font-bold text-[#002962] dark:text-[#93C5FD] shrink-0 mt-0.5">
                        Correct
                      </span>
                    )}
                    {answered && isSelected && !isCorrect && (
                      <span className="text-[11px] font-bold text-red-700 dark:text-red-300 shrink-0 mt-0.5">
                        Incorrect
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {chosenOption !== null && (
              <div
                className="pt-3.5 border-t border-[#002962]/12 dark:border-[#94B3DB]/18 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                data-testid="quiz-answer-feedback"
              >
                <div className="space-y-1 text-xs sm:text-[13px] max-w-[50ch]">
                  <p
                    className={
                      chosenOption === currentQuestion.correctIndex
                        ? 'font-bold text-[#002962] dark:text-[#93C5FD]'
                        : 'font-bold text-red-700 dark:text-red-300'
                    }
                  >
                    {chosenOption === currentQuestion.correctIndex
                      ? 'Correct!'
                      : 'Not quite — added to Needs Practice for extra review.'}
                  </p>
                  <p className="text-[#3B5578] dark:text-[#9FB3CE]">
                    <strong className="font-semibold text-[#002962] dark:text-white">Example:</strong>{' '}
                    {currentQuestion.example}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="h-9 px-5 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] shrink-0 cursor-pointer"
                >
                  {currentIndex + 1 >= questions.length ? 'View Results' : 'Next Question'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 3: Results */}
      {phase === 'results' && (
        <div className="max-w-[660px] mx-auto space-y-5" data-testid="quiz-results">
          <div className="text-center space-y-1.5 py-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#EA580C] dark:text-[#FB923C]">
              Quiz Complete
            </p>
            <h3
              className="font-editorial text-3xl font-semibold tracking-[-0.025em] text-[#002962] dark:text-white tabular-nums"
              data-testid="quiz-final-score"
            >
              {correctAnswers.length} / {questions.length} ({scorePct}%)
            </h3>
            <p className="text-sm text-[#3B5578] dark:text-[#9FB3CE]">
              {scorePct >= 80
                ? 'Strong recall across your IPMAT & CUET list.'
                : 'Missed entries were logged in Needs Practice so you can drill them next.'}
            </p>
          </div>

          <div className="border border-[#002962]/12 dark:border-[#94B3DB]/18 rounded-xl divide-y divide-[#002962]/10 dark:divide-[#94B3DB]/15 bg-white dark:bg-[#16233B] overflow-hidden">
            {answers.map((item, idx) => (
              <div key={item.question.id} className="px-4 py-3 text-sm space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-[#002962] dark:text-[#E8EEF7]">
                    {idx + 1}. {item.question.expression}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      item.isCorrect ? 'text-[#002962] dark:text-[#93C5FD]' : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {item.isCorrect ? 'Correct' : 'Missed'}
                  </span>
                </div>
                <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE]">
                  <strong className="text-[#002962] dark:text-white">Meaning:</strong>{' '}
                  {item.question.correctMeaning}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {correctAnswers.length > 0 && !promotedMastered && (
              <button
                type="button"
                onClick={() => {
                  onMarkEntriesMastered(correctAnswers.map((a) => a.question.entryId));
                  setPromotedMastered(true);
                }}
                className="h-10 px-5 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] cursor-pointer"
              >
                Mark {correctAnswers.length} Correct as Mastered
              </button>
            )}
            {promotedMastered && (
              <span className="text-xs font-bold text-[#002962] dark:text-[#93C5FD]">
                Marked {correctAnswers.length} entries as Mastered.
              </span>
            )}
            <button
              type="button"
              onClick={handleResetToSetup}
              className="h-10 px-5 text-sm font-semibold bg-[#EEF3F9] dark:bg-[#1B2B45] border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#E1EAF5] dark:hover:bg-[#24385A] cursor-pointer"
            >
              New Quiz
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
      )}
    </section>
  );
};
