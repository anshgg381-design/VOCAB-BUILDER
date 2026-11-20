import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  VocabEntry,
  getCategoryInsightData,
  getMasteryDistributionData,
  getMasteryStats,
} from '../utils/vocabLogic';

interface LibraryInsightsPanelProps {
  entries: VocabEntry[];
}

export const LibraryInsightsPanel: React.FC<LibraryInsightsPanelProps> = ({ entries }) => {
  const [categoryViewMode, setCategoryViewMode] = useState<'breakdown' | 'learnedOnly'>('breakdown');
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    const syncTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const categoryData = useMemo(() => getCategoryInsightData(entries), [entries]);
  const distributionData = useMemo(() => getMasteryDistributionData(entries), [entries]);
  const stats = useMemo(() => getMasteryStats(entries), [entries]);

  const chartPalette = isDark
    ? {
        mastered: '#3B82F6',
        learning: '#FB923C',
        newColor: '#64748B',
        grid: 'rgba(147, 197, 253, 0.14)',
        axisLine: 'rgba(147, 197, 253, 0.22)',
        tickPrimary: '#E8EEF7',
        tickSecondary: '#9FB3CE',
        cursorFill: 'rgba(147, 197, 253, 0.08)',
        tooltipBg: '#0D1626',
        tooltipBorder: 'rgba(147, 197, 253, 0.24)',
        tooltipColor: '#F1F5F9',
      }
    : {
        mastered: '#002962',
        learning: '#EA580C',
        newColor: '#94A3B8',
        grid: '#E2E8F0',
        axisLine: '#CBD5E1',
        tickPrimary: '#002962',
        tickSecondary: '#3B5578',
        cursorFill: '#F5F3F0',
        tooltipBg: '#FFFFFF',
        tooltipBorder: 'rgba(0, 41, 98, 0.16)',
        tooltipColor: '#002962',
      };

  const masteryColors: Record<string, string> = {
    new: chartPalette.newColor,
    learning: chartPalette.learning,
    mastered: chartPalette.mastered,
  };

  return (
    <section
      aria-label="Vocabulary learning insights"
      data-testid="library-insights-section"
      className="nesoi-card p-4 sm:p-5 space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#002962]/12 dark:border-[#93C5FD]/15">
        <div>
          <h2 className="font-editorial text-xl font-semibold tracking-[-0.02em] text-[#002962] dark:text-[#F1F5F9]">
            Insights
          </h2>
          <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] mt-0.5">
            Track words learned across Words, Idioms, and Phrasal Verbs alongside your mastery distribution.
          </p>
        </div>

        {/* Chart Mode Segmented Switch */}
        <div
          role="group"
          aria-label="Category chart view"
          className="inline-flex items-center p-1 rounded-lg bg-[#EAE7E1] dark:bg-[#0D1626] border border-[#002962]/10 dark:border-[#93C5FD]/15 self-start sm:self-auto"
        >
          <button
            type="button"
            aria-pressed={categoryViewMode === 'breakdown'}
            onClick={() => setCategoryViewMode('breakdown')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              categoryViewMode === 'breakdown'
                ? 'bg-[#002962] dark:bg-[#2563EB] text-white shadow-sm'
                : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
            }`}
          >
            All Mastery Levels
          </button>
          <button
            type="button"
            aria-pressed={categoryViewMode === 'learnedOnly'}
            onClick={() => setCategoryViewMode('learnedOnly')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              categoryViewMode === 'learnedOnly'
                ? 'bg-[#002962] dark:bg-[#2563EB] text-white shadow-sm'
                : 'text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white'
            }`}
          >
            Learned (Mastered)
          </button>
        </div>
      </div>

      {/* Category & Mastery KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {categoryData.map((cat) => (
          <div
            key={cat.category}
            className="rounded-lg border border-[#002962]/12 dark:border-[#93C5FD]/15 bg-[#F5F3F0] dark:bg-[#0D1626] px-3.5 py-2.5"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#3B5578] dark:text-[#9FB3CE]">
              {cat.label}
            </p>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className="text-xl font-bold text-[#002962] dark:text-[#F1F5F9] tabular-nums">
                {cat.mastered}
                <span className="text-xs font-semibold text-[#5E7494] dark:text-[#7C95B6]">/{cat.total}</span>
              </span>
              <span className="text-[11.5px] font-semibold text-[#3B5578] dark:text-[#9FB3CE] tabular-nums">
                {cat.percentMastered}% mastered
              </span>
            </div>
          </div>
        ))}
        <div className="rounded-lg border border-[#002962]/20 dark:border-[#60A5FA]/30 bg-[#EEF3F9] dark:bg-[#172540] px-3.5 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#002962] dark:text-[#93C5FD]">
            Overall Mastered
          </p>
          <div className="mt-0.5 flex items-baseline justify-between gap-2">
            <span className="text-xl font-bold text-[#002962] dark:text-white tabular-nums">
              {stats.masteredCount}
              <span className="text-xs font-semibold text-[#3B5578] dark:text-[#9FB3CE]">/{stats.total}</span>
            </span>
            <span className="text-[11.5px] font-bold text-[#EA580C] dark:text-[#FB923C] tabular-nums">
              {stats.percentMastered}%
            </span>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="py-10 text-center rounded-lg border border-dashed border-[#002962]/20 dark:border-[#93C5FD]/22 bg-[#F5F3F0] dark:bg-[#0D1626]">
          <p className="text-sm font-semibold text-[#002962] dark:text-[#F1F5F9]">No vocabulary data yet</p>
          <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] mt-1">
            Save words, idioms, or phrasal verbs to see category and mastery insights here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Words Learned per Category */}
          <div
            className="rounded-lg border border-[#002962]/12 dark:border-[#93C5FD]/15 bg-white dark:bg-[#0D1626] p-4 space-y-3"
            data-testid="insights-category-chart"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[14px] font-bold text-[#002962] dark:text-[#F1F5F9]">
                {categoryViewMode === 'learnedOnly'
                  ? 'Mastered Words per Category'
                  : 'Entries & Mastery per Category'}
              </h3>
              <span className="text-[11.5px] text-[#3B5578] dark:text-[#9FB3CE]">
                Words · Idioms · Phrasal Verbs
              </span>
            </div>

            <div className="w-full h-[205px]">
              <ResponsiveContainer width="100%" height={205} minWidth={0}>
                <BarChart
                  data={categoryData}
                  margin={{ top: 10, right: 12, left: -16, bottom: 2 }}
                  barGap={6}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: chartPalette.tickPrimary, fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: chartPalette.axisLine }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, (max: number) => Math.max(2, max)]}
                    tick={{ fill: chartPalette.tickSecondary, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: chartPalette.cursorFill }}
                    contentStyle={{
                      backgroundColor: chartPalette.tooltipBg,
                      border: `1px solid ${chartPalette.tooltipBorder}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: chartPalette.tooltipColor,
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.18)',
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: '12px',
                      paddingTop: '6px',
                      color: chartPalette.tickSecondary,
                    }}
                  />
                  <Bar
                    dataKey="mastered"
                    name="Mastered"
                    stackId={categoryViewMode === 'breakdown' ? 'cat' : undefined}
                    fill={chartPalette.mastered}
                    radius={categoryViewMode === 'learnedOnly' ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={44}
                  />
                  {categoryViewMode === 'breakdown' && (
                    <>
                      <Bar
                        dataKey="learning"
                        name="Learning"
                        stackId="cat"
                        fill={chartPalette.learning}
                        maxBarSize={44}
                      />
                      <Bar
                        dataKey="newCount"
                        name="New"
                        stackId="cat"
                        fill={chartPalette.newColor}
                        radius={[5, 5, 0, 0]}
                        maxBarSize={44}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Mastery Level Distribution */}
          <div
            className="rounded-lg border border-[#002962]/12 dark:border-[#93C5FD]/15 bg-white dark:bg-[#0D1626] p-4 space-y-3"
            data-testid="insights-mastery-chart"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[14px] font-bold text-[#002962] dark:text-[#F1F5F9]">
                Mastery Level Distribution
              </h3>
              <span className="text-[11.5px] text-[#3B5578] dark:text-[#9FB3CE] tabular-nums">
                {stats.total} total entries
              </span>
            </div>

            <div className="w-full h-[205px]">
              <ResponsiveContainer width="100%" height={205} minWidth={0}>
                <BarChart
                  data={distributionData}
                  margin={{ top: 10, right: 12, left: -16, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: chartPalette.tickPrimary, fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: chartPalette.axisLine }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, (max: number) => Math.max(2, max)]}
                    tick={{ fill: chartPalette.tickSecondary, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: chartPalette.cursorFill }}
                    formatter={(value: unknown) => [`${value} entries`, 'Count']}
                    contentStyle={{
                      backgroundColor: chartPalette.tooltipBg,
                      border: `1px solid ${chartPalette.tooltipBorder}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: chartPalette.tooltipColor,
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.18)',
                    }}
                  />
                  <Bar dataKey="count" name="Entries" radius={[5, 5, 0, 0]} maxBarSize={56}>
                    {distributionData.map((item) => (
                      <Cell
                        key={item.level}
                        fill={masteryColors[item.level] || chartPalette.mastered}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
