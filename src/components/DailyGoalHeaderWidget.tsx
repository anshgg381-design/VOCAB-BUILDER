import React, { useEffect, useRef, useState } from 'react';
import { Check, Flame, Sparkles } from 'lucide-react';
import {
  DailyGoalStats,
  MAX_DAILY_GOAL,
  MIN_DAILY_GOAL,
  clampDailyGoal,
} from '../utils/vocabLogic';

interface DailyGoalHeaderWidgetProps {
  stats: DailyGoalStats;
  isCelebrating: boolean;
  onUpdateTarget: (nextTarget: number) => void;
}

const SPARKS: Array<{ dx: string; dy: string; rot: string; color: string }> = [
  { dx: '-34px', dy: '-24px', rot: '-40deg', color: '#002962' },
  { dx: '34px', dy: '-22px', rot: '45deg', color: '#EA580C' },
  { dx: '-42px', dy: '6px', rot: '-75deg', color: '#2563EB' },
  { dx: '42px', dy: '8px', rot: '60deg', color: '#16A34A' },
  { dx: '-20px', dy: '24px', rot: '30deg', color: '#EA580C' },
  { dx: '22px', dy: '24px', rot: '-35deg', color: '#002962' },
  { dx: '0px', dy: '-30px', rot: '15deg', color: '#F97316' },
  { dx: '-10px', dy: '28px', rot: '-20deg', color: '#2563EB' },
];

export const DailyGoalHeaderWidget: React.FC<DailyGoalHeaderWidgetProps> = ({
  stats,
  isCelebrating,
  onUpdateTarget,
}) => {
  const [open, setOpen] = useState(false);
  const [draftTarget, setDraftTarget] = useState(String(stats.target));
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftTarget(String(stats.target));
  }, [stats.target]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(draftTarget);
    const clamped = clampDailyGoal(parsed);
    onUpdateTarget(clamped);
    setDraftTarget(String(clamped));
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      data-testid="daily-goal-widget"
      data-goal-reached={stats.goalReached ? 'true' : 'false'}
      data-celebrating={isCelebrating ? 'true' : 'false'}
    >
      {/* Celebration Spark Burst */}
      {isCelebrating && (
        <span aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-visible">
          {SPARKS.map((s, idx) => (
            <span
              key={idx}
              className="goal-spark"
              style={
                {
                  '--dx': s.dx,
                  '--dy': s.dy,
                  '--rot': s.rot,
                  backgroundColor: s.color,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Daily goal: ${stats.savedToday} of ${stats.target} words today, ${stats.streakDays}-day streak`}
        className={`h-9 px-3 sm:px-3.5 inline-flex items-center gap-2 rounded-md border text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
          stats.goalReached
            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50'
            : 'bg-[#002962]/[0.05] dark:bg-[#172540] border-[#002962]/18 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] hover:bg-[#002962]/[0.09] dark:hover:bg-[#1E3154]'
        } ${isCelebrating ? 'goal-celebrating' : ''}`}
      >
        <span
          className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
            stats.streakDays > 0 ? 'text-[#EA580C] dark:text-[#FB923C]' : 'text-[#3B5578] dark:text-[#9FB3CE]'
          }`}
          data-testid="daily-streak-count"
          title={`${stats.streakDays}-day streak`}
        >
          <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{stats.streakDays}d</span>
        </span>

        <span className="text-[#002962]/20 dark:text-[#93C5FD]/25" aria-hidden="true">
          |
        </span>

        {isCelebrating ? (
          <span
            className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300"
            data-testid="goal-reached-badge"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Goal Reached!</span>
          </span>
        ) : stats.goalReached ? (
          <span
            className="inline-flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-200 tabular-nums"
            data-testid="goal-reached-badge"
          >
            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Goal Reached</span>
            <span>
              {stats.savedToday}/{stats.target}
            </span>
          </span>
        ) : (
          <span className="tabular-nums text-[#002962] dark:text-[#E8EEF7]" data-testid="daily-goal-progress">
            {stats.savedToday}/{stats.target}
            <span className="hidden lg:inline text-[#3B5578] dark:text-[#9FB3CE] font-medium"> today</span>
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Daily vocabulary goal settings"
          className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/20 rounded-xl shadow-xl p-4 z-50 space-y-3.5"
        >
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[#002962] dark:text-[#F1F5F9]">Daily Goal</p>
              <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] tabular-nums">
                {stats.savedToday} of {stats.target} words saved today
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#EA580C] dark:text-[#FB923C] tabular-nums">
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
              {stats.streakDays} {stats.streakDays === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Daily goal completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stats.progressPercent}
            className="h-2 w-full bg-[#E8E6E0] dark:bg-[#1E2E47] rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-[#002962] dark:bg-[#3B82F6] transition-all duration-300"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>

          {stats.goalReached && (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Today&apos;s target is complete. Great consistency!
            </p>
          )}

          <form onSubmit={handleSave} className="space-y-2.5 pt-2 border-t border-[#002962]/10 dark:border-[#93C5FD]/15">
            <label htmlFor="daily-goal-input" className="block text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]">
              Target words per day ({MIN_DAILY_GOAL}–{MAX_DAILY_GOAL})
            </label>
            <div className="flex items-center gap-1.5">
              {[3, 5, 10, 15].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onUpdateTarget(preset);
                    setDraftTarget(String(preset));
                    setOpen(false);
                  }}
                  className={`flex-1 h-7 text-xs font-semibold rounded-md border cursor-pointer transition-colors ${
                    stats.target === preset
                      ? 'bg-[#002962] dark:bg-[#2563EB] border-[#002962] dark:border-[#2563EB] text-white'
                      : 'bg-[#F5F3F0] dark:bg-[#172540] border-[#002962]/15 dark:border-[#93C5FD]/20 text-[#002962] dark:text-[#E8EEF7] hover:bg-[#002962]/[0.06] dark:hover:bg-[#1E3154]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="daily-goal-input"
                type="number"
                min={MIN_DAILY_GOAL}
                max={MAX_DAILY_GOAL}
                value={draftTarget}
                onChange={(e) => setDraftTarget(e.target.value)}
                className="w-full h-8 px-3 text-sm border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#0D1626] text-[#002962] dark:text-[#E8EEF7] tabular-nums focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
              />
              <button
                type="submit"
                className="h-8 px-3.5 text-xs font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] whitespace-nowrap cursor-pointer"
              >
                Save Goal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
