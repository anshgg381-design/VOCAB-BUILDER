import React, { useMemo, useState } from 'react';
import { Calendar, Check, Pencil, X } from 'lucide-react';
import {
  ExamTargetConfig,
  VocabEntry,
  computeExamCountdown,
  getLocalDateKey,
} from '../utils/vocabLogic';

interface ExamCountdownBarProps {
  config: ExamTargetConfig | null;
  entries: VocabEntry[];
  onSaveConfig: (next: ExamTargetConfig | null) => void;
}

const EXAM_PRESETS = ['CUET', 'IPMAT', 'CUET & IPMAT'];

export const ExamCountdownBar: React.FC<ExamCountdownBarProps> = ({
  config,
  entries,
  onSaveConfig,
}) => {
  const [editing, setEditing] = useState(false);
  const [examName, setExamName] = useState(config?.examName || 'CUET');
  const [examDate, setExamDate] = useState(() => {
    if (config?.examDate) return config.examDate;
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 42);
    return getLocalDateKey(defaultDate);
  });
  const [error, setError] = useState('');

  const countdown = useMemo(() => computeExamCountdown(config, entries), [config, entries]);

  const openEditor = () => {
    setExamName(config?.examName || 'CUET');
    if (config?.examDate) {
      setExamDate(config.examDate);
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 42);
      setExamDate(getLocalDateKey(defaultDate));
    }
    setError('');
    setEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDate = examDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setError('Please pick a valid target exam date.');
      return;
    }
    const trimmedName = examName.trim() || 'CUET';
    onSaveConfig({ examName: trimmedName, examDate: trimmedDate });
    setEditing(false);
    setError('');
  };

  const handleClear = () => {
    onSaveConfig(null);
    setEditing(false);
    setError('');
  };

  return (
    <section
      aria-label="Exam countdown and revision pace"
      data-testid="exam-countdown-bar"
      className="nesoi-card px-5 py-4 space-y-3"
    >
      {!editing ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#EEF3F9] dark:bg-[#1B2B45] border border-[#002962]/15 dark:border-[#94B3DB]/20 flex items-center justify-center text-[#002962] dark:text-[#93C5FD] shrink-0">
              <Calendar className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="font-editorial text-[16px] font-semibold text-[#002962] dark:text-[#E8EEF7]">
                  Exam Countdown &amp; Revision Pace
                </h2>
                {countdown && countdown.status === 'upcoming' && (
                  <span
                    className="text-xs font-bold text-[#EA580C] dark:text-[#FB923C] tabular-nums"
                    data-testid="exam-days-badge"
                  >
                    {countdown.daysRemaining} {countdown.daysRemaining === 1 ? 'day' : 'days'} left
                  </span>
                )}
              </div>
              {countdown ? (
                <p
                  className="text-[13.5px] text-[#1A3459] dark:text-[#C8D8EC] tabular-nums"
                  data-testid="exam-countdown-summary"
                >
                  {countdown.summaryText}
                </p>
              ) : (
                <p className="text-[13px] text-[#3B5578] dark:text-[#9FB3CE]">
                  Set your IPMAT or CUET exam date to calculate the exact daily mastery pace needed to finish your queue.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={openEditor}
              data-testid="exam-countdown-edit-btn"
              className="h-8 px-3.5 inline-flex items-center gap-1.5 text-xs font-semibold bg-[#EEF3F9] dark:bg-[#1B2B45] border border-[#002962]/20 dark:border-[#94B3DB]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#24385A] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Pencil className="w-3 h-3" aria-hidden="true" />
              {countdown ? 'Edit Date' : 'Set Exam Date'}
            </button>
            {countdown && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear exam countdown"
                className="h-8 px-2.5 text-xs font-medium text-[#3B5578] dark:text-[#9FB3CE] hover:text-red-700 dark:hover:text-red-400 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3"
          data-testid="exam-countdown-form"
          noValidate
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-editorial text-[16px] font-semibold text-[#002962] dark:text-[#E8EEF7]">
              Set Your Target Exam Date
            </h2>
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="Cancel editing exam countdown"
              className="text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <span className="block text-xs font-semibold text-[#002962] dark:text-[#E8EEF7]">
                Exam
              </span>
              <div className="inline-flex items-center p-0.5 rounded-md bg-[#EAE7E1] dark:bg-[#1B2B45] border border-[#002962]/12 dark:border-[#94B3DB]/20">
                {EXAM_PRESETS.map((preset) => {
                  const active = examName === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setExamName(preset)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[#002962] dark:bg-[#2563EB] text-white shadow-sm'
                          : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1 flex-1 min-w-[140px]">
              <label
                htmlFor="exam-name-input"
                className="block text-xs font-semibold text-[#002962] dark:text-[#E8EEF7]"
              >
                Label
              </label>
              <input
                id="exam-name-input"
                type="text"
                maxLength={32}
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="CUET / IPMAT"
                className="w-full h-9 px-3 text-sm border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md bg-white dark:bg-[#0B1220] text-[#002962] dark:text-[#E8EEF7] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="exam-date-input"
                className="block text-xs font-semibold text-[#002962] dark:text-[#E8EEF7]"
              >
                Target Date
              </label>
              <input
                id="exam-date-input"
                data-testid="exam-date-input"
                type="date"
                value={examDate}
                onChange={(e) => {
                  setExamDate(e.target.value);
                  setError('');
                }}
                className="h-9 px-3 text-sm border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md bg-white dark:bg-[#0B1220] text-[#002962] dark:text-[#E8EEF7] tabular-nums focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                data-testid="exam-countdown-save-btn"
                className="h-9 px-4 inline-flex items-center gap-1.5 text-xs font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] whitespace-nowrap cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Save Target
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-9 px-3 text-xs font-semibold border border-[#002962]/20 dark:border-[#94B3DB]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#1B2B45] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
};
