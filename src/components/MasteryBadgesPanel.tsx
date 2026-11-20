import React, { useMemo } from 'react';
import { Award, BookOpenCheck, Compass, Crown, GraduationCap, Lock } from 'lucide-react';
import {
  MasteryBadgeId,
  VocabEntry,
  getMasteryBadgeProgress,
} from '../utils/vocabLogic';

interface MasteryBadgesPanelProps {
  entries: VocabEntry[];
}

const BADGE_ICONS: Record<MasteryBadgeId, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  novice: Compass,
  word_collector: BookOpenCheck,
  vocabulary_scholar: GraduationCap,
  lexicon_tactician: Award,
  master_learner: Crown,
};

export const MasteryBadgesPanel: React.FC<MasteryBadgesPanelProps> = ({ entries }) => {
  const progress = useMemo(() => getMasteryBadgeProgress(entries), [entries]);

  return (
    <section
      aria-label="Mastery badges"
      data-testid="mastery-badges-section"
      className="nesoi-card px-5 py-4 space-y-3.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h2 className="font-editorial text-[17px] font-semibold text-[#002962] dark:text-[#F1F5F9]">
            Mastery Badges
          </h2>
          <span
            className="text-xs text-[#3B5578] dark:text-[#9FB3CE] tabular-nums"
            data-testid="badges-summary"
          >
            {progress.unlockedCount} of {progress.totalBadges} unlocked · {progress.masteredCount}{' '}
            {progress.masteredCount === 1 ? 'word' : 'words'} mastered
          </span>
        </div>

        <div className="text-xs font-semibold text-[#002962] dark:text-[#E8EEF7] tabular-nums" data-testid="badges-rank-status">
          {progress.currentBadge ? (
            <>
              Current Rank: <span className="text-[#EA580C] dark:text-[#FB923C]">{progress.currentBadge.title}</span>
              {progress.nextBadge ? (
                <span className="font-normal text-[#3B5578] dark:text-[#9FB3CE]">
                  {' '}· Next: {progress.nextBadge.title} ({progress.nextBadge.remaining} more)
                </span>
              ) : (
                <span className="font-normal text-[#3B5578] dark:text-[#9FB3CE]"> · Top tier reached</span>
              )}
            </>
          ) : (
            <span className="font-normal text-[#3B5578] dark:text-[#9FB3CE]">
              Master 1 word to unlock <strong className="font-semibold text-[#002962] dark:text-white">Novice</strong>
            </span>
          )}
        </div>
      </div>

      <div
        role="list"
        aria-label="Unlockable vocabulary mastery badges"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5"
      >
        {progress.badges.map((badge) => {
          const IconComponent = BADGE_ICONS[badge.id];
          const isMasterTier = badge.id === 'master_learner';
          const isNextTarget = progress.nextBadge?.id === badge.id;

          return (
            <div
              key={badge.id}
              role="listitem"
              data-testid={`badge-card-${badge.id}`}
              data-unlocked={badge.unlocked ? 'true' : 'false'}
              className={`rounded-lg border px-3.5 py-3 flex flex-col justify-between gap-2.5 transition-colors ${
                badge.unlocked
                  ? isMasterTier
                    ? 'border-[#EA580C]/40 dark:border-[#FB923C]/40 bg-[#FFF7ED] dark:bg-[#EA580C]/15'
                    : 'border-[#002962]/20 dark:border-[#60A5FA]/30 bg-[#EEF3F9]/75 dark:bg-[#172540]'
                  : isNextTarget
                  ? 'border-[#002962]/20 dark:border-[#93C5FD]/22 bg-[#F5F3F0] dark:bg-[#0D1626]'
                  : 'border-[#002962]/10 dark:border-[#93C5FD]/12 bg-[#F5F3F0]/60 dark:bg-[#0D1626]/70'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`relative w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    badge.unlocked
                      ? isMasterTier
                        ? 'bg-[#EA580C] text-white'
                        : 'bg-[#002962] dark:bg-[#2563EB] text-white'
                      : 'bg-[#EAE7E1] dark:bg-[#1A2942] text-[#5E7494] dark:text-[#7C95B6]'
                  }`}
                >
                  <IconComponent className="w-[18px] h-[18px]" aria-hidden={true} />
                  {!badge.unlocked && (
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/25 flex items-center justify-center text-[#5E7494] dark:text-[#9FB3CE]"
                      aria-hidden="true"
                    >
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-[13.5px] font-bold leading-snug ${
                      badge.unlocked
                        ? 'text-[#002962] dark:text-[#F1F5F9]'
                        : 'text-[#3B5578] dark:text-[#9FB3CE]'
                    }`}
                  >
                    {badge.title}
                  </p>
                  <p className="text-[11.5px] text-[#3B5578] dark:text-[#9FB3CE] leading-snug mt-0.5">
                    {badge.threshold} {badge.threshold === 1 ? 'word' : 'words'} mastered
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold tabular-nums">
                  <span
                    className={
                      badge.unlocked
                        ? isMasterTier
                          ? 'text-[#EA580C] dark:text-[#FB923C]'
                          : 'text-[#002962] dark:text-[#93C5FD]'
                        : 'text-[#5E7494] dark:text-[#7C95B6]'
                    }
                  >
                    {badge.unlocked ? 'Unlocked' : isNextTarget ? 'In Progress' : 'Locked'}
                  </span>
                  <span className="text-[#3B5578] dark:text-[#9FB3CE]">
                    {Math.min(progress.masteredCount, badge.threshold)}/{badge.threshold}
                  </span>
                </div>

                <div
                  className="h-1.5 w-full bg-[#E3DFD7] dark:bg-[#1E2E47] rounded-full overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      badge.unlocked
                        ? isMasterTier
                          ? 'bg-[#EA580C] dark:bg-[#FB923C]'
                          : 'bg-[#002962] dark:bg-[#3B82F6]'
                        : 'bg-[#3B5578]/50 dark:bg-[#64748B]/70'
                    }`}
                    style={{ width: `${badge.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
