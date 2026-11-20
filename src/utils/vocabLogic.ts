export type Category = 'vocabulary' | 'idioms' | 'phrasalVerbs';
export type MasteryLevel = 'new' | 'learning' | 'mastered';
export type StudyScope = 'dailyReview' | 'all' | 'needsReview' | Category;
export type StudyOutcome = 'known' | 'needsReview';

export interface VocabEntry {
  id: string;
  expression: string;
  category: Category;
  meaning: string;
  example: string;
  contextSentence: string;
  sourceTitle: string;
  sourceUrl: string;
  dateAdded: string;
  learned: boolean;
  masteryLevel?: MasteryLevel;
  favourite: boolean;
  nextReviewAt?: string;
  lastReviewedAt?: string;
  reviewIntervalDays?: number;
  reviewCount?: number;
  missCount?: number;
  lastMissedAt?: string;
}

export interface ExamTargetConfig {
  examName: string;
  examDate: string; // YYYY-MM-DD
}

export interface ExamCountdownStats {
  examName: string;
  examDate: string;
  daysRemaining: number;
  remainingQueue: number;
  masteredCount: number;
  totalEntries: number;
  dailyPaceNeeded: number;
  status: 'upcoming' | 'today' | 'past';
  summaryText: string;
}

export const CATEGORIES: Record<Category, string> = {
  vocabulary: 'Vocabulary',
  idioms: 'Idioms',
  phrasalVerbs: 'Phrasal Verbs',
};

export const CATEGORY_SINGULAR: Record<Category, string> = {
  vocabulary: 'Word',
  idioms: 'Idiom',
  phrasalVerbs: 'Phrasal Verb',
};

export const VALID_CATEGORIES: Category[] = ['vocabulary', 'idioms', 'phrasalVerbs'];
export const VALID_MASTERY_LEVELS: MasteryLevel[] = ['new', 'learning', 'mastered'];
export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  new: 'New',
  learning: 'Learning',
  mastered: 'Mastered',
};

export const QUIZ_MIN_QUESTIONS = 5;
export const QUIZ_MAX_QUESTIONS = 20;
export const DEFAULT_DAILY_GOAL = 5;
export const MIN_DAILY_GOAL = 1;
export const MAX_DAILY_GOAL = 50;

export interface QuizQuestion {
  id: string;
  entryId: string;
  expression: string;
  category: Category;
  masteryLevel: MasteryLevel;
  example: string;
  options: string[];
  correctIndex: number;
  correctMeaning: string;
}

export interface DailyGoalStats {
  target: number;
  savedToday: number;
  goalReached: boolean;
  progressPercent: number;
  streakDays: number;
  todayKey: string;
}

const PHRASAL_PARTICLES = new Set([
  'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'away', 'back',
  'through', 'across', 'along', 'around', 'about', 'after', 'against',
  'apart', 'aside', 'by', 'for', 'forward', 'into', 'onto', 'round',
  'to', 'with', 'without', 'ahead', 'forth', 'together', 'upon', 'of',
]);

const PHRASAL_VERB_HEADS = new Set([
  'act', 'acted', 'acting', 'acts', 'add', 'ask', 'back', 'bail', 'bank',
  'bear', 'bore', 'borne', 'beat', 'blow', 'blew', 'blown', 'boil', 'branch',
  'break', 'broke', 'broken', 'breaking', 'bring', 'brought', 'bringing',
  'brush', 'build', 'built', 'burn', 'call', 'called', 'calm', 'care',
  'carry', 'carried', 'catch', 'caught', 'check', 'cheer', 'chip', 'clamp',
  'clean', 'clear', 'close', 'come', 'came', 'coming', 'comes', 'count',
  'crack', 'cross', 'cut', 'cutting', 'deal', 'dealt', 'die', 'dig', 'dug',
  'do', 'did', 'done', 'drag', 'draw', 'drew', 'dress', 'drift', 'drop',
  'dropped', 'dry', 'ease', 'eat', 'ate', 'end', 'face', 'fade', 'fall',
  'fell', 'fallen', 'feel', 'fend', 'figure', 'figured', 'fill', 'find',
  'found', 'finish', 'fit', 'fix', 'follow', 'get', 'got', 'gotten', 'getting',
  'give', 'gave', 'given', 'giving', 'go', 'went', 'gone', 'going', 'grow',
  'grew', 'hand', 'hang', 'hung', 'head', 'hear', 'help', 'hinge', 'hit',
  'hold', 'held', 'iron', 'join', 'jot', 'jump', 'keep', 'kept', 'kick',
  'knock', 'lash', 'laugh', 'lay', 'laid', 'lead', 'led', 'lean', 'leave',
  'left', 'let', 'lie', 'light', 'line', 'live', 'lock', 'log', 'look',
  'looked', 'looking', 'looks', 'make', 'made', 'making', 'map', 'mark',
  'meet', 'met', 'mess', 'miss', 'mix', 'move', 'mull', 'narrow', 'nod',
  'open', 'opt', 'own', 'pack', 'pan', 'pass', 'patch', 'pay', 'paid',
  'phase', 'pick', 'picked', 'pile', 'pin', 'pitch', 'plan', 'play', 'plug',
  'point', 'polish', 'pop', 'pour', 'press', 'pull', 'pulled', 'push',
  'put', 'putting', 'puts', 'ramp', 'reach', 'read', 'reel', 'rely', 'ring',
  'rip', 'roll', 'root', 'round', 'rub', 'rule', 'run', 'ran', 'running',
  'runs', 'rush', 'scale', 'scrape', 'see', 'saw', 'seek', 'sell', 'sold',
  'send', 'sent', 'set', 'setting', 'settle', 'shake', 'shell', 'shift',
  'shoot', 'shop', 'show', 'shrug', 'shut', 'sign', 'single', 'sink', 'sit',
  'sat', 'size', 'sleep', 'slip', 'slow', 'snap', 'sneak', 'soak', 'sort',
  'spark', 'speak', 'spoke', 'speed', 'spell', 'spin', 'split', 'spread',
  'spring', 'stamp', 'stand', 'stood', 'start', 'stave', 'stay', 'stem',
  'step', 'stick', 'stuck', 'stir', 'stock', 'stop', 'strike', 'struck',
  'strip', 'stumble', 'sum', 'sweep', 'switch', 'take', 'took', 'taken',
  'taking', 'talk', 'taper', 'tear', 'tore', 'tell', 'told', 'think',
  'thought', 'throw', 'threw', 'tick', 'tide', 'tie', 'tip', 'tone', 'top',
  'touch', 'track', 'trade', 'trip', 'try', 'tried', 'tuck', 'tune', 'turn',
  'turned', 'turning', 'use', 'usher', 'veer', 'vouch', 'wait', 'wake',
  'woke', 'walk', 'ward', 'warm', 'wash', 'watch', 'water', 'wear', 'wore',
  'weed', 'weigh', 'whip', 'win', 'won', 'wind', 'wipe', 'work', 'worked',
  'wrap', 'write', 'wrote', 'yield', 'zero', 'zone', 'zoom',
]);

export function normalizeExpression(raw: string): string {
  return raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/^[\s"'`“”‘’(\[{•\-–—*.,;:!?]+/, '')
    .replace(/[\s"'`“”‘’)\]}.,;:!?]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeKey(raw: string): string {
  return normalizeExpression(raw).toLowerCase();
}

export function detectCategory(rawExpression: string): Category {
  const cleaned = normalizeExpression(rawExpression);
  if (!cleaned) return 'vocabulary';

  const tokens = cleaned
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/g, ''))
    .filter(Boolean);

  if (tokens.length <= 1) return 'vocabulary';

  if (tokens.length === 2) {
    if (PHRASAL_VERB_HEADS.has(tokens[0]) && PHRASAL_PARTICLES.has(tokens[1])) {
      return 'phrasalVerbs';
    }
    return 'idioms';
  }

  if (tokens.length === 3) {
    if (
      PHRASAL_VERB_HEADS.has(tokens[0]) &&
      PHRASAL_PARTICLES.has(tokens[1]) &&
      PHRASAL_PARTICLES.has(tokens[2])
    ) {
      return 'phrasalVerbs';
    }
    if (tokens[0] === 'get' && tokens[1] === 'rid' && tokens[2] === 'of') {
      return 'phrasalVerbs';
    }
    return 'idioms';
  }

  return 'idioms';
}

export function parseBulkInput(rawText: string): string[] {
  const pieces = rawText.split(/[\r\n,]+/);
  const seen = new Set<string>();
  const results: string[] = [];

  for (const rawPiece of pieces) {
    const stripped = rawPiece.replace(/^\s*(?:\d+[.)]\s+|[-–—•*]\s+)/, '');
    const cleaned = normalizeExpression(stripped);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(cleaned);
  }
  return results;
}

export function extractContextSentence(fullText: string, selectedText: string): string {
  const cleanFull = fullText.replace(/\s+/g, ' ').trim();
  const cleanSelected = selectedText.replace(/\s+/g, ' ').trim();
  if (!cleanFull || !cleanSelected) return '';

  const idx = cleanFull.toLowerCase().indexOf(cleanSelected.toLowerCase());
  if (idx === -1) {
    return cleanFull.length > 360 ? cleanFull.slice(0, 360).trim() : cleanFull;
  }

  let start = idx;
  while (start > 0) {
    const ch = cleanFull[start - 1];
    if ((ch === '.' || ch === '!' || ch === '?') && /\s/.test(cleanFull[start] || ' ')) {
      break;
    }
    if (idx - start > 220) break;
    start--;
  }

  let end = idx + cleanSelected.length;
  while (end < cleanFull.length) {
    const ch = cleanFull[end];
    if (ch === '.' || ch === '!' || ch === '?') {
      end++;
      break;
    }
    if (end - (idx + cleanSelected.length) > 220) break;
    end++;
  }

  return cleanFull.slice(start, end).trim();
}

export function findDuplicate(entries: VocabEntry[], expression: string): VocabEntry | null {
  const key = normalizeKey(expression);
  if (!key) return null;
  return entries.find((e) => normalizeKey(e.expression) === key) || null;
}

export function getCategoryCounts(entries: VocabEntry[]) {
  const counts = { vocabulary: 0, idioms: 0, phrasalVerbs: 0, total: 0 };
  for (const e of entries) {
    counts[e.category]++;
  }
  counts.total = counts.vocabulary + counts.idioms + counts.phrasalVerbs;
  return counts;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'cuet_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getMasteryLevel(entry: Pick<VocabEntry, 'masteryLevel' | 'learned'>): MasteryLevel {
  if (entry.masteryLevel && VALID_MASTERY_LEVELS.includes(entry.masteryLevel)) {
    return entry.masteryLevel;
  }
  return entry.learned ? 'mastered' : 'new';
}

export function getMasteryStats(entries: VocabEntry[]) {
  let newCount = 0;
  let learningCount = 0;
  let masteredCount = 0;

  for (const entry of entries) {
    const level = getMasteryLevel(entry);
    if (level === 'mastered') masteredCount++;
    else if (level === 'learning') learningCount++;
    else newCount++;
  }

  const total = entries.length;
  const percentMastered = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
  const percentLearning = total > 0 ? Math.round((learningCount / total) * 100) : 0;

  return {
    total,
    newCount,
    learningCount,
    masteredCount,
    percentMastered,
    percentLearning,
  };
}

export type MasteryBadgeId =
  | 'novice'
  | 'word_collector'
  | 'vocabulary_scholar'
  | 'lexicon_tactician'
  | 'master_learner';

export interface MasteryBadgeDefinition {
  id: MasteryBadgeId;
  title: string;
  threshold: number;
  description: string;
}

export interface MasteryBadgeStatus extends MasteryBadgeDefinition {
  unlocked: boolean;
  progressPercent: number;
  remaining: number;
}

export interface MasteryBadgeProgress {
  masteredCount: number;
  unlockedCount: number;
  totalBadges: number;
  currentBadge: MasteryBadgeStatus | null;
  nextBadge: MasteryBadgeStatus | null;
  badges: MasteryBadgeStatus[];
}

export const MASTERY_BADGES: MasteryBadgeDefinition[] = [
  {
    id: 'novice',
    title: 'Novice',
    threshold: 1,
    description: 'Master your first word, idiom, or phrasal verb',
  },
  {
    id: 'word_collector',
    title: 'Word Collector',
    threshold: 5,
    description: 'Master 5 saved expressions',
  },
  {
    id: 'vocabulary_scholar',
    title: 'Vocabulary Scholar',
    threshold: 15,
    description: 'Master 15 saved expressions',
  },
  {
    id: 'lexicon_tactician',
    title: 'Lexicon Tactician',
    threshold: 30,
    description: 'Master 30 saved expressions',
  },
  {
    id: 'master_learner',
    title: 'Master Learner',
    threshold: 50,
    description: 'Master 50 saved expressions',
  },
];

export function getMasteryBadgeProgress(entries: VocabEntry[]): MasteryBadgeProgress {
  const { masteredCount } = getMasteryStats(entries);
  const badges: MasteryBadgeStatus[] = MASTERY_BADGES.map((badge) => {
    const unlocked = masteredCount >= badge.threshold;
    const remaining = Math.max(0, badge.threshold - masteredCount);
    const progressPercent = Math.min(100, Math.round((masteredCount / badge.threshold) * 100));
    return {
      ...badge,
      unlocked,
      progressPercent,
      remaining,
    };
  });

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const currentBadge = unlockedBadges.length > 0 ? unlockedBadges[unlockedBadges.length - 1] : null;
  const nextBadge = badges.find((b) => !b.unlocked) || null;

  return {
    masteredCount,
    unlockedCount: unlockedBadges.length,
    totalBadges: badges.length,
    currentBadge,
    nextBadge,
    badges,
  };
}

export interface CategoryInsightDatum {
  category: Category;
  label: string;
  total: number;
  mastered: number;
  learning: number;
  newCount: number;
  percentMastered: number;
}

export interface MasteryDistributionDatum {
  level: MasteryLevel;
  label: string;
  count: number;
  percent: number;
}

export function getCategoryInsightData(entries: VocabEntry[]): CategoryInsightDatum[] {
  const meta: Array<{ category: Category; label: string }> = [
    { category: 'vocabulary', label: 'Words' },
    { category: 'idioms', label: 'Idioms' },
    { category: 'phrasalVerbs', label: 'Phrasal Verbs' },
  ];

  return meta.map((item) => {
    const subset = entries.filter((e) => e.category === item.category);
    let mastered = 0;
    let learning = 0;
    let newCount = 0;

    for (const entry of subset) {
      const level = getMasteryLevel(entry);
      if (level === 'mastered') mastered++;
      else if (level === 'learning') learning++;
      else newCount++;
    }

    const total = subset.length;
    const percentMastered = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return {
      category: item.category,
      label: item.label,
      total,
      mastered,
      learning,
      newCount,
      percentMastered,
    };
  });
}

export function getMasteryDistributionData(entries: VocabEntry[]): MasteryDistributionDatum[] {
  const stats = getMasteryStats(entries);
  const pct = (n: number) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0);
  return [
    { level: 'new', label: 'New', count: stats.newCount, percent: pct(stats.newCount) },
    { level: 'learning', label: 'Learning', count: stats.learningCount, percent: pct(stats.learningCount) },
    { level: 'mastered', label: 'Mastered', count: stats.masteredCount, percent: pct(stats.masteredCount) },
  ];
}

export function formatEntryCopyText(
  entry: Pick<VocabEntry, 'expression' | 'meaning' | 'example'>
): string {
  const expr = entry.expression.trim();
  const meaning = entry.meaning.trim();
  const example = entry.example.trim();
  return `${expr} — ${meaning}${example ? ` (Example: ${example})` : ''}`;
}

export function getMissCount(entry: Pick<VocabEntry, 'missCount'>): number {
  return typeof entry.missCount === 'number' && Number.isFinite(entry.missCount) && entry.missCount > 0
    ? Math.floor(entry.missCount)
    : 0;
}

export function isNeedsPractice(entry: Pick<VocabEntry, 'missCount'>): boolean {
  return getMissCount(entry) > 0;
}

export function recordEntryMissPatch(
  entry: Pick<VocabEntry, 'missCount' | 'reviewCount'>,
  now: Date = new Date()
): Partial<VocabEntry> {
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const nextMissCount = getMissCount(entry) + 1;
  return {
    missCount: nextMissCount,
    lastMissedAt: safeNow.toISOString(),
    masteryLevel: 'learning',
    learned: false,
    lastReviewedAt: safeNow.toISOString(),
    reviewIntervalDays: 1,
    nextReviewAt: new Date(safeNow.getTime() + DAY_MS).toISOString(),
  };
}

export function getUniqueSources(entries: VocabEntry[]): Array<{ title: string; count: number }> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const title = (entry.sourceTitle || '').trim();
    if (!title) continue;
    counts.set(title, (counts.get(title) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    });
}

export function computeExamCountdown(
  config: ExamTargetConfig | null,
  entries: VocabEntry[],
  now: Date = new Date()
): ExamCountdownStats | null {
  if (!config || !config.examDate || !/^\d{4}-\d{2}-\d{2}$/.test(config.examDate.trim())) {
    return null;
  }
  const examName = (config.examName || 'CUET').trim() || 'CUET';
  const [y, m, d] = config.examDate.trim().split('-').map(Number);
  const targetMidnight = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (Number.isNaN(targetMidnight.getTime())) return null;

  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const todayMidnight = new Date(
    safeNow.getFullYear(),
    safeNow.getMonth(),
    safeNow.getDate(),
    0,
    0,
    0,
    0
  );

  const daysRemaining = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / DAY_MS);
  const { total, masteredCount } = getMasteryStats(entries);
  const remainingQueue = Math.max(0, total - masteredCount);

  const status: ExamCountdownStats['status'] =
    daysRemaining > 0 ? 'upcoming' : daysRemaining === 0 ? 'today' : 'past';

  const dailyPaceNeeded =
    remainingQueue === 0
      ? 0
      : daysRemaining > 0
      ? Math.ceil(remainingQueue / daysRemaining)
      : remainingQueue;

  let summaryText: string;
  if (status === 'today') {
    summaryText =
      remainingQueue > 0
        ? `${examName} is today · Final quick revision of ${remainingQueue} ${remainingQueue === 1 ? 'word' : 'words'}`
        : `${examName} is today · All ${total} saved words mastered!`;
  } else if (status === 'past') {
    const daysAgo = Math.abs(daysRemaining);
    summaryText = `${examName} date passed ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago · Update your next exam date`;
  } else if (remainingQueue === 0) {
    summaryText = `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} to ${examName} · All ${total} saved words mastered!`;
  } else {
    summaryText = `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} to ${examName} · Master ${dailyPaceNeeded} ${
      dailyPaceNeeded === 1 ? 'word' : 'words'
    }/day to finish your ${remainingQueue}-word queue`;
  }

  return {
    examName,
    examDate: config.examDate.trim(),
    daysRemaining,
    remainingQueue,
    masteredCount,
    totalEntries: total,
    dailyPaceNeeded,
    status,
    summaryText,
  };
}

export type LibraryMasteryFilter =
  | 'all'
  | MasteryLevel
  | 'favourites'
  | 'needsPractice'
  | 'dueToday';

export type LibrarySortOrder = 'recent' | 'az' | 'za' | 'mostMissed';

export function filterAndSortEntries(
  entries: VocabEntry[],
  options: {
    category: 'all' | Category;
    query: string;
    masteryFilter: LibraryMasteryFilter;
    sortOrder: LibrarySortOrder;
    sourceFilter?: string;
    now?: Date;
  }
): VocabEntry[] {
  const q = options.query.trim().toLowerCase();
  const safeNow = options.now ?? new Date();
  let list =
    options.category === 'all'
      ? [...entries]
      : entries.filter((e) => e.category === options.category);

  if (options.masteryFilter === 'favourites') {
    list = list.filter((e) => e.favourite);
  } else if (options.masteryFilter === 'needsPractice') {
    list = list.filter((e) => isNeedsPractice(e));
  } else if (options.masteryFilter === 'dueToday') {
    list = list.filter((e) => getEntryReviewSchedule(e, safeNow).isDueToday);
  } else if (options.masteryFilter !== 'all') {
    list = list.filter((e) => getMasteryLevel(e) === options.masteryFilter);
  }

  if (options.sourceFilter && options.sourceFilter !== 'all') {
    const srcTarget = options.sourceFilter.trim().toLowerCase();
    list = list.filter((e) => (e.sourceTitle || '').trim().toLowerCase() === srcTarget);
  }

  if (q) {
    list = list.filter(
      (e) =>
        e.expression.toLowerCase().includes(q) ||
        e.meaning.toLowerCase().includes(q) ||
        e.example.toLowerCase().includes(q) ||
        (e.contextSentence || '').toLowerCase().includes(q) ||
        (e.sourceTitle || '').toLowerCase().includes(q)
    );
  }

  const sorted = [...list];
  if (options.sortOrder === 'az') {
    sorted.sort((a, b) => a.expression.localeCompare(b.expression, undefined, { sensitivity: 'base' }));
  } else if (options.sortOrder === 'za') {
    sorted.sort((a, b) => b.expression.localeCompare(a.expression, undefined, { sensitivity: 'base' }));
  } else if (options.sortOrder === 'mostMissed') {
    sorted.sort((a, b) => {
      const diff = getMissCount(b) - getMissCount(a);
      if (diff !== 0) return diff;
      return Date.parse(b.dateAdded) - Date.parse(a.dateAdded);
    });
  } else {
    sorted.sort((a, b) => Date.parse(b.dateAdded) - Date.parse(a.dateAdded));
  }
  return sorted;
}

export interface EntryReviewSchedule {
  masteryLevel: MasteryLevel;
  reviewCount: number;
  intervalDays: number;
  nextReviewAt: string;
  isDueToday: boolean;
  isOverdue: boolean;
  overdueDays: number;
  daysUntilDue: number;
  scheduleLabel: string;
}

export interface DailyReviewQueueItem {
  entry: VocabEntry;
  schedule: EntryReviewSchedule;
}

export interface DailyReviewQueue {
  dueEntries: VocabEntry[];
  dueItems: DailyReviewQueueItem[];
  upcomingItems: DailyReviewQueueItem[];
  totalDue: number;
  overdueCount: number;
  dueTodayCount: number;
  nextUpcomingItem: DailyReviewQueueItem | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function getReviewIntervalDays(masteryLevel: MasteryLevel, reviewCount = 0): number {
  const safeCount = Number.isFinite(reviewCount) && reviewCount > 0 ? Math.floor(reviewCount) : 0;
  if (masteryLevel === 'new') return 1;
  if (masteryLevel === 'learning') return safeCount >= 2 ? 4 : 3;
  if (safeCount >= 3) return 30;
  if (safeCount === 2) return 14;
  return 7;
}

export function createInitialReviewSchedule(now: Date = new Date()): {
  lastReviewedAt: string;
  reviewCount: number;
  reviewIntervalDays: number;
  nextReviewAt: string;
} {
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  return {
    lastReviewedAt: safeNow.toISOString(),
    reviewCount: 0,
    reviewIntervalDays: 1,
    nextReviewAt: new Date(safeNow.getTime() + DAY_MS).toISOString(),
  };
}

export function previewReviewIntervals(entry: Pick<VocabEntry, 'reviewCount'>): {
  needsReviewDays: number;
  masteredDays: number;
} {
  const currentCount =
    typeof entry.reviewCount === 'number' && Number.isFinite(entry.reviewCount) && entry.reviewCount >= 0
      ? Math.floor(entry.reviewCount)
      : 0;
  const nextCount = currentCount + 1;
  return {
    needsReviewDays: getReviewIntervalDays('learning', nextCount),
    masteredDays: getReviewIntervalDays('mastered', nextCount),
  };
}

export function calculateReviewPatch(
  entry: Pick<VocabEntry, 'reviewCount'>,
  nextMastery: MasteryLevel,
  options: { now?: Date; countAsReview?: boolean } = {}
): {
  masteryLevel: MasteryLevel;
  learned: boolean;
  lastReviewedAt: string;
  reviewCount: number;
  reviewIntervalDays: number;
  nextReviewAt: string;
} {
  const now = options.now instanceof Date && !Number.isNaN(options.now.getTime()) ? options.now : new Date();
  const currentCount =
    typeof entry.reviewCount === 'number' && Number.isFinite(entry.reviewCount) && entry.reviewCount >= 0
      ? Math.floor(entry.reviewCount)
      : 0;

  let nextCount: number;
  if (nextMastery === 'new') {
    nextCount = 0;
  } else if (options.countAsReview === false) {
    nextCount = currentCount;
  } else {
    nextCount = currentCount + 1;
  }

  const intervalDays = getReviewIntervalDays(nextMastery, nextCount);
  return {
    masteryLevel: nextMastery,
    learned: nextMastery === 'mastered',
    lastReviewedAt: now.toISOString(),
    reviewCount: nextCount,
    reviewIntervalDays: intervalDays,
    nextReviewAt: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
  };
}

export function getEntryReviewSchedule(entry: VocabEntry, now: Date = new Date()): EntryReviewSchedule {
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const masteryLevel = getMasteryLevel(entry);
  const reviewCount =
    typeof entry.reviewCount === 'number' && Number.isFinite(entry.reviewCount) && entry.reviewCount >= 0
      ? Math.floor(entry.reviewCount)
      : 0;
  const intervalDays =
    typeof entry.reviewIntervalDays === 'number' &&
    Number.isFinite(entry.reviewIntervalDays) &&
    entry.reviewIntervalDays > 0
      ? Math.round(entry.reviewIntervalDays)
      : getReviewIntervalDays(masteryLevel, reviewCount);

  let nextReviewAt: string;
  if (typeof entry.nextReviewAt === 'string' && !Number.isNaN(Date.parse(entry.nextReviewAt))) {
    nextReviewAt = entry.nextReviewAt;
  } else {
    const anchorStr =
      typeof entry.lastReviewedAt === 'string' && !Number.isNaN(Date.parse(entry.lastReviewedAt))
        ? entry.lastReviewedAt
        : entry.dateAdded;
    const anchorMs = Date.parse(anchorStr);
    const baseMs = Number.isNaN(anchorMs) ? safeNow.getTime() : anchorMs;
    nextReviewAt = new Date(baseMs + intervalDays * DAY_MS).toISOString();
  }

  const dueDate = new Date(nextReviewAt);
  const startOfToday = new Date(safeNow.getFullYear(), safeNow.getMonth(), safeNow.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(safeNow.getFullYear(), safeNow.getMonth(), safeNow.getDate(), 23, 59, 59, 999);
  const startOfDueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 0, 0, 0, 0);

  const isDueToday = dueDate.getTime() <= endOfToday.getTime();
  const isOverdue = startOfDueDay.getTime() < startOfToday.getTime();
  const overdueDays = isOverdue
    ? Math.max(1, Math.round((startOfToday.getTime() - startOfDueDay.getTime()) / DAY_MS))
    : 0;
  const daysUntilDue = !isDueToday
    ? Math.max(1, Math.round((startOfDueDay.getTime() - startOfToday.getTime()) / DAY_MS))
    : 0;

  let scheduleLabel: string;
  if (isOverdue) {
    scheduleLabel = overdueDays === 1 ? 'Overdue by 1d' : `Overdue by ${overdueDays}d`;
  } else if (isDueToday) {
    scheduleLabel = 'Due today';
  } else if (daysUntilDue === 1) {
    scheduleLabel = 'Due tomorrow';
  } else {
    scheduleLabel = `Next review in ${daysUntilDue}d`;
  }

  return {
    masteryLevel,
    reviewCount,
    intervalDays,
    nextReviewAt,
    isDueToday,
    isOverdue,
    overdueDays,
    daysUntilDue,
    scheduleLabel,
  };
}

export function getDailyReviewQueue(entries: VocabEntry[], now: Date = new Date()): DailyReviewQueue {
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const priority: Record<MasteryLevel, number> = {
    new: 0,
    learning: 1,
    mastered: 2,
  };

  const dueItems: DailyReviewQueueItem[] = [];
  const upcomingItems: DailyReviewQueueItem[] = [];

  for (const entry of entries) {
    const schedule = getEntryReviewSchedule(entry, safeNow);
    if (schedule.isDueToday) {
      dueItems.push({ entry, schedule });
    } else {
      upcomingItems.push({ entry, schedule });
    }
  }

  dueItems.sort((a, b) => {
    const dueDiff = Date.parse(a.schedule.nextReviewAt) - Date.parse(b.schedule.nextReviewAt);
    if (dueDiff !== 0) return dueDiff;
    const pDiff = priority[a.schedule.masteryLevel] - priority[b.schedule.masteryLevel];
    if (pDiff !== 0) return pDiff;
    return Date.parse(a.entry.dateAdded) - Date.parse(b.entry.dateAdded);
  });

  upcomingItems.sort(
    (a, b) => Date.parse(a.schedule.nextReviewAt) - Date.parse(b.schedule.nextReviewAt)
  );

  const overdueCount = dueItems.filter((item) => item.schedule.isOverdue).length;
  const dueTodayCount = dueItems.length - overdueCount;

  return {
    dueEntries: dueItems.map((item) => item.entry),
    dueItems,
    upcomingItems,
    totalDue: dueItems.length,
    overdueCount,
    dueTodayCount,
    nextUpcomingItem: upcomingItems[0] || null,
  };
}

export function getStudyMasteryForOutcome(outcome: StudyOutcome): MasteryLevel {
  return outcome === 'known' ? 'mastered' : 'learning';
}

export function buildStudyDeck(
  entries: VocabEntry[],
  scope: StudyScope = 'all',
  now: Date = new Date()
): VocabEntry[] {
  if (scope === 'dailyReview') {
    return getDailyReviewQueue(entries, now).dueEntries;
  }

  let filtered: VocabEntry[];
  if (scope === 'all') {
    filtered = [...entries];
  } else if (scope === 'needsReview') {
    filtered = entries.filter((e) => getMasteryLevel(e) !== 'mastered');
  } else {
    filtered = entries.filter((e) => e.category === scope);
  }

  const priority: Record<MasteryLevel, number> = {
    new: 0,
    learning: 1,
    mastered: 2,
  };

  return filtered.sort((a, b) => {
    const pa = priority[getMasteryLevel(a)];
    const pb = priority[getMasteryLevel(b)];
    if (pa !== pb) return pa - pb;
    return Date.parse(b.dateAdded) - Date.parse(a.dateAdded);
  });
}

const FALLBACK_QUIZ_DISTRACTORS: string[] = [
  'Happening occasionally without any clear pattern or plan.',
  'To delay a decision until more reliable facts are available.',
  'Showing calm patience when facing a sudden setback.',
  'To explain a complex rule in a brief, direct manner.',
  'Relating to ideas that are based on theory rather than everyday practice.',
  'To withdraw quietly from an agreement or public discussion.',
];

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getQuizEligibleEntries(entries: VocabEntry[]): VocabEntry[] {
  return entries.filter((e) => {
    const level = getMasteryLevel(e);
    return level === 'new' || level === 'learning';
  });
}

export function generateQuizQuestions(
  allEntries: VocabEntry[],
  options: {
    mode: 'random' | 'custom';
    count?: number;
    selectedIds?: string[];
    rng?: () => number;
  }
): { ok: true; questions: QuizQuestion[] } | { ok: false; error: string } {
  const rng = options.rng || Math.random;
  const eligible = getQuizEligibleEntries(allEntries);

  if (eligible.length < QUIZ_MIN_QUESTIONS) {
    return {
      ok: false,
      error: `You need at least ${QUIZ_MIN_QUESTIONS} "New" or "Learning" entries to start a quiz (currently ${eligible.length}).`,
    };
  }

  let chosen: VocabEntry[];
  if (options.mode === 'custom') {
    const idSet = new Set(options.selectedIds || []);
    chosen = eligible.filter((e) => idSet.has(e.id));
    if (chosen.length < QUIZ_MIN_QUESTIONS) {
      return {
        ok: false,
        error: `Select at least ${QUIZ_MIN_QUESTIONS} entries to start a custom quiz.`,
      };
    }
    if (chosen.length > QUIZ_MAX_QUESTIONS) {
      return {
        ok: false,
        error: `You can select at most ${QUIZ_MAX_QUESTIONS} entries per quiz.`,
      };
    }
    chosen = shuffleWithRng(chosen, rng);
  } else {
    const maxAllowed = Math.min(QUIZ_MAX_QUESTIONS, eligible.length);
    const requested = typeof options.count === 'number' ? Math.round(options.count) : QUIZ_MIN_QUESTIONS;
    const clampedCount = Math.max(QUIZ_MIN_QUESTIONS, Math.min(maxAllowed, requested));
    chosen = shuffleWithRng(eligible, rng).slice(0, clampedCount);
  }

  const questions: QuizQuestion[] = chosen.map((entry, idx) => {
    const correctMeaning = entry.meaning.trim();
    const seenMeanings = new Set<string>([correctMeaning.toLowerCase()]);

    const sameCatPool = shuffleWithRng(
      allEntries.filter((other) => other.id !== entry.id && other.category === entry.category),
      rng
    );
    const otherCatPool = shuffleWithRng(
      allEntries.filter((other) => other.id !== entry.id && other.category !== entry.category),
      rng
    );

    const distractors: string[] = [];
    for (const candidate of [...sameCatPool, ...otherCatPool]) {
      if (distractors.length >= 3) break;
      const m = candidate.meaning.trim();
      const key = m.toLowerCase();
      if (m && !seenMeanings.has(key)) {
        seenMeanings.add(key);
        distractors.push(m);
      }
    }

    if (distractors.length < 3) {
      for (const fallback of shuffleWithRng(FALLBACK_QUIZ_DISTRACTORS, rng)) {
        if (distractors.length >= 3) break;
        const key = fallback.toLowerCase();
        if (!seenMeanings.has(key)) {
          seenMeanings.add(key);
          distractors.push(fallback);
        }
      }
    }

    const shuffledOptions = shuffleWithRng([correctMeaning, ...distractors.slice(0, 3)], rng);
    const correctIndex = shuffledOptions.indexOf(correctMeaning);

    return {
      id: `q_${idx}_${entry.id}`,
      entryId: entry.id,
      expression: entry.expression,
      category: entry.category,
      masteryLevel: getMasteryLevel(entry),
      example: entry.example,
      options: shuffledOptions,
      correctIndex,
      correctMeaning,
    };
  });

  return { ok: true, questions };
}

export function getLocalDateKey(input: Date | string = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function clampDailyGoal(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DAILY_GOAL;
  return Math.max(MIN_DAILY_GOAL, Math.min(MAX_DAILY_GOAL, Math.round(value)));
}

export function computeDailyGoalStats(
  entries: VocabEntry[],
  rawTarget: number,
  now: Date = new Date()
): DailyGoalStats {
  const target = clampDailyGoal(rawTarget);
  const countsByDay = new Map<string, number>();

  for (const entry of entries) {
    const key = getLocalDateKey(entry.dateAdded);
    if (!key) continue;
    countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
  }

  const todayKey = getLocalDateKey(now);
  const savedToday = countsByDay.get(todayKey) || 0;
  const goalReached = savedToday >= target;
  const progressPercent = Math.min(100, Math.round((savedToday / target) * 100));

  // Count consecutive days meeting target (including active streak through yesterday if today isn't done yet)
  let streakDays = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!goalReached) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = getLocalDateKey(cursor);
    const count = countsByDay.get(key) || 0;
    if (count >= target) {
      streakDays++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    target,
    savedToday,
    goalReached,
    progressPercent,
    streakDays,
    todayKey,
  };
}

export function buildExportJson(entries: VocabEntry[]) {
  return {
    app: 'IPMAT/CUET VOCAB BUILDER',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: getCategoryCounts(entries),
    entries: entries.map((e) => {
      const masteryLevel = getMasteryLevel(e);
      return {
        id: e.id,
        expression: e.expression,
        category: e.category,
        meaning: e.meaning,
        example: e.example,
        contextSentence: e.contextSentence,
        sourceTitle: e.sourceTitle,
        sourceUrl: e.sourceUrl,
        dateAdded: e.dateAdded,
        learned: masteryLevel === 'mastered',
        masteryLevel,
        favourite: e.favourite,
        ...(typeof e.nextReviewAt === 'string' && !Number.isNaN(Date.parse(e.nextReviewAt))
          ? { nextReviewAt: e.nextReviewAt }
          : {}),
        ...(typeof e.lastReviewedAt === 'string' && !Number.isNaN(Date.parse(e.lastReviewedAt))
          ? { lastReviewedAt: e.lastReviewedAt }
          : {}),
        ...(typeof e.reviewIntervalDays === 'number' && e.reviewIntervalDays > 0
          ? { reviewIntervalDays: Math.round(e.reviewIntervalDays) }
          : {}),
        ...(typeof e.reviewCount === 'number' && e.reviewCount >= 0
          ? { reviewCount: Math.floor(e.reviewCount) }
          : {}),
        ...(typeof e.missCount === 'number' && e.missCount > 0
          ? { missCount: Math.floor(e.missCount) }
          : {}),
        ...(typeof e.lastMissedAt === 'string' && !Number.isNaN(Date.parse(e.lastMissedAt))
          ? { lastMissedAt: e.lastMissedAt }
          : {}),
      };
    }),
  };
}

export function validateAndMergeImport(existingEntries: VocabEntry[], payload: unknown): {
  ok: boolean;
  error?: string;
  mergedEntries: VocabEntry[];
  addedCount: number;
  skippedCount: number;
} {
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      error: 'Invalid backup file: expected a JSON object.',
      mergedEntries: existingEntries,
      addedCount: 0,
      skippedCount: 0,
    };
  }

  const obj = payload as Record<string, unknown>;
  let rawList: unknown[] | null = null;
  if (Array.isArray(obj.entries)) {
    rawList = obj.entries;
  } else if (
    Array.isArray(obj.vocabulary) ||
    Array.isArray(obj.idioms) ||
    Array.isArray(obj.phrasalVerbs)
  ) {
    rawList = [
      ...(Array.isArray(obj.vocabulary)
        ? obj.vocabulary.map((item) => ({ ...(item as Record<string, unknown>), category: 'vocabulary' }))
        : []),
      ...(Array.isArray(obj.idioms)
        ? obj.idioms.map((item) => ({ ...(item as Record<string, unknown>), category: 'idioms' }))
        : []),
      ...(Array.isArray(obj.phrasalVerbs)
        ? obj.phrasalVerbs.map((item) => ({ ...(item as Record<string, unknown>), category: 'phrasalVerbs' }))
        : []),
    ];
  }

  if (!rawList) {
    return {
      ok: false,
      error: 'Invalid backup file: no entries list found.',
      mergedEntries: existingEntries,
      addedCount: 0,
      skippedCount: 0,
    };
  }

  const merged = [...existingEntries];
  const existingKeys = new Set(merged.map((e) => normalizeKey(e.expression)));
  const existingIds = new Set(merged.map((e) => e.id));

  let addedCount = 0;
  let skippedCount = 0;
  let invalidCount = 0;

  for (const item of rawList) {
    if (!item || typeof item !== 'object') {
      invalidCount++;
      continue;
    }
    const r = item as Record<string, unknown>;
    const expression = normalizeExpression(String(r.expression || ''));
    const meaning = typeof r.meaning === 'string' ? r.meaning.trim() : '';
    const example = typeof r.example === 'string' ? r.example.trim() : '';
    if (!expression || !meaning || !example) {
      invalidCount++;
      continue;
    }

    const key = normalizeKey(expression);
    if (existingKeys.has(key)) {
      skippedCount++;
      continue;
    }

    const category: Category = VALID_CATEGORIES.includes(r.category as Category)
      ? (r.category as Category)
      : detectCategory(expression);

    let id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : generateId();
    if (existingIds.has(id)) id = generateId();

    const dateAdded =
      typeof r.dateAdded === 'string' && !Number.isNaN(Date.parse(r.dateAdded))
        ? r.dateAdded
        : new Date().toISOString();

    const masteryLevel: MasteryLevel = VALID_MASTERY_LEVELS.includes(r.masteryLevel as MasteryLevel)
      ? (r.masteryLevel as MasteryLevel)
      : r.learned
      ? 'mastered'
      : 'new';

    merged.push({
      id,
      expression,
      category,
      meaning,
      example,
      contextSentence: typeof r.contextSentence === 'string' ? r.contextSentence.trim() : '',
      sourceTitle: typeof r.sourceTitle === 'string' ? r.sourceTitle.trim() : '',
      sourceUrl: typeof r.sourceUrl === 'string' ? r.sourceUrl.trim() : '',
      dateAdded,
      learned: masteryLevel === 'mastered',
      masteryLevel,
      favourite: Boolean(r.favourite),
      ...(typeof r.nextReviewAt === 'string' && !Number.isNaN(Date.parse(r.nextReviewAt))
        ? { nextReviewAt: r.nextReviewAt }
        : {}),
      ...(typeof r.lastReviewedAt === 'string' && !Number.isNaN(Date.parse(r.lastReviewedAt))
        ? { lastReviewedAt: r.lastReviewedAt }
        : {}),
      ...(typeof r.reviewIntervalDays === 'number' && r.reviewIntervalDays > 0
        ? { reviewIntervalDays: Math.round(r.reviewIntervalDays) }
        : {}),
      ...(typeof r.reviewCount === 'number' && r.reviewCount >= 0
        ? { reviewCount: Math.floor(r.reviewCount) }
        : {}),
      ...(typeof r.missCount === 'number' && r.missCount > 0
        ? { missCount: Math.floor(r.missCount) }
        : {}),
      ...(typeof r.lastMissedAt === 'string' && !Number.isNaN(Date.parse(r.lastMissedAt))
        ? { lastMissedAt: r.lastMissedAt }
        : {}),
    });

    existingKeys.add(key);
    existingIds.add(id);
    addedCount++;
  }

  if (addedCount === 0 && skippedCount === 0 && invalidCount > 0) {
    return {
      ok: false,
      error: 'No valid vocabulary entries were found in this file.',
      mergedEntries: existingEntries,
      addedCount: 0,
      skippedCount: 0,
    };
  }

  return { ok: true, mergedEntries: merged, addedCount, skippedCount };
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function buildCsv(entries: VocabEntry[]): string {
  const headers = ['Word', 'Meaning', 'Example Sentence'];
  const lines = [headers.map(escapeCsvCell).join(',')];

  for (const e of entries) {
    lines.push(
      [e.expression, e.meaning, e.example]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  return lines.join('\r\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeTsvCell(value: string): string {
  return value
    .replace(/\t+/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .trim();
}

export function buildAnkiTsv(entries: VocabEntry[]): string {
  const lines = ['#separator:tab', '#html:true', '#tags column:3'];

  for (const entry of entries) {
    const expr = sanitizeTsvCell(entry.expression || '');
    if (!expr) continue;
    const meaning = escapeHtml(sanitizeTsvCell(entry.meaning || ''));
    const example = escapeHtml(sanitizeTsvCell(entry.example || ''));
    const front = escapeHtml(expr);
    const back = `<strong>Meaning:</strong> ${meaning}${
      example ? `<br><br><strong>Example:</strong> ${example}` : ''
    }`;
    const catTag = entry.category === 'phrasalVerbs' ? 'phrasal_verbs' : entry.category;
    const level = getMasteryLevel(entry);
    const tags = ['cuet', 'ipmat', catTag, level];
    if (entry.favourite) tags.push('favourite');
    lines.push([front, back, tags.join(' ')].join('\t'));
  }

  return lines.join('\n');
}

export interface PulledSheetRow {
  category?: Category;
  expression: string;
  meaning: string;
  example: string;
}

export interface PulledSheetMergeResult {
  ok: true;
  mergedEntries: VocabEntry[];
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  skippedCount: number;
}

export function mergePulledSheetEntries(
  existingEntries: VocabEntry[],
  pulledRows: PulledSheetRow[],
  nowIso: string = new Date().toISOString()
): PulledSheetMergeResult {
  const base = existingEntries.map((e) => ({ ...e }));
  const indexByKey = new Map<string, number>();
  const existingIds = new Set<string>();

  base.forEach((e, idx) => {
    const key = normalizeKey(e.expression);
    if (key && !indexByKey.has(key)) indexByKey.set(key, idx);
    if (e.id) existingIds.add(e.id);
  });

  const timestamp = !Number.isNaN(Date.parse(nowIso)) ? nowIso : new Date().toISOString();
  let addedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedCount = 0;
  const seenIncoming = new Set<string>();

  for (const row of pulledRows) {
    if (!row || typeof row !== 'object') {
      skippedCount++;
      continue;
    }
    const expression = normalizeExpression(String(row.expression || ''));
    const meaning = typeof row.meaning === 'string' ? row.meaning.trim() : '';
    const example = typeof row.example === 'string' ? row.example.trim() : '';
    if (!expression || !meaning) {
      skippedCount++;
      continue;
    }

    const lowerExpr = expression.toLowerCase();
    if (
      (lowerExpr === 'word' || lowerExpr === 'idiom' || lowerExpr === 'phrasal verb') &&
      meaning.toLowerCase() === 'meaning'
    ) {
      skippedCount++;
      continue;
    }

    const key = normalizeKey(expression);
    if (!key || seenIncoming.has(key)) {
      skippedCount++;
      continue;
    }
    seenIncoming.add(key);

    const resolvedCategory: Category = VALID_CATEGORIES.includes(row.category as Category)
      ? (row.category as Category)
      : detectCategory(expression);

    if (indexByKey.has(key)) {
      const idx = indexByKey.get(key)!;
      const current = base[idx];
      const nextMeaning = meaning || current.meaning;
      const nextExample = example || current.example;
      if (nextMeaning !== current.meaning || nextExample !== current.example) {
        base[idx] = {
          ...current,
          meaning: nextMeaning,
          example: nextExample,
        };
        updatedCount++;
      } else {
        unchangedCount++;
      }
    } else {
      let id = generateId();
      while (existingIds.has(id)) id = generateId();
      existingIds.add(id);
      base.push({
        id,
        expression,
        category: resolvedCategory,
        meaning,
        example: example || `Saved "${expression}" from Google Sheets.`,
        contextSentence: '',
        sourceTitle: 'Google Sheets Sync',
        sourceUrl: '',
        dateAdded: timestamp,
        learned: false,
        masteryLevel: 'new',
        favourite: false,
      });
      indexByKey.set(key, base.length - 1);
      addedCount++;
    }
  }

  return {
    ok: true,
    mergedEntries: base,
    addedCount,
    updatedCount,
    unchangedCount,
    skippedCount,
  };
}

export function getHighlightableEntries(entries: VocabEntry[]): VocabEntry[] {
  return entries.filter((entry) => {
    const level = getMasteryLevel(entry);
    return level === 'new' || level === 'learning';
  });
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildHighlightMatcher(
  entries: VocabEntry[],
  maxTerms = 300
): { regex: RegExp | null; map: Map<string, VocabEntry>; count: number } {
  const active = getHighlightableEntries(entries);
  const map = new Map<string, VocabEntry>();
  const terms: string[] = [];

  for (const entry of active) {
    const expr = normalizeExpression(entry.expression);
    const key = normalizeKey(expr);
    if (!expr || expr.length < 2 || !key || map.has(key)) continue;
    map.set(key, entry);
    terms.push(expr);
    if (terms.length >= maxTerms) break;
  }

  if (terms.length === 0) {
    return { regex: null, map, count: 0 };
  }

  terms.sort((a, b) => b.length - a.length);
  const pattern = `\\b(${terms.map((t) => escapeRegExp(t).replace(/\s+/g, '\\s+')).join('|')})\\b`;
  return {
    regex: new RegExp(pattern, 'gi'),
    map,
    count: terms.length,
  };
}

export const INITIAL_DEMO_ENTRIES: VocabEntry[] = [
  {
    id: 'seed-vocab-1',
    expression: 'ubiquitous',
    category: 'vocabulary',
    meaning: 'Present or seen almost everywhere at the same time.',
    example: 'Short video clips have become ubiquitous on every major news website.',
    contextSentence: 'Today, algorithmic feeds are ubiquitous across nearly every platform we open.',
    sourceTitle: 'The Attention Economy — Sample Essay',
    sourceUrl: 'https://aeon.co/essays/example',
    dateAdded: '2026-11-18T09:15:00.000Z',
    learned: false,
    masteryLevel: 'learning',
    favourite: true,
    missCount: 1,
    lastMissedAt: '2026-11-19T08:00:00.000Z',
    reviewCount: 1,
    reviewIntervalDays: 1,
    nextReviewAt: '2026-11-20T08:00:00.000Z',
  },
  {
    id: 'seed-vocab-2',
    expression: 'pragmatic',
    category: 'vocabulary',
    meaning: 'Dealing with problems in a practical, realistic way rather than relying on theory.',
    example: 'She followed a pragmatic revision timetable during the final month before CUET.',
    contextSentence: 'Over time, a pragmatic habit of collecting five expressions a day outperforms cramming.',
    sourceTitle: 'The Quiet Craft of Slow Reading',
    sourceUrl: 'https://aeon.co/essays/slow-reading',
    dateAdded: '2026-11-18T08:40:00.000Z',
    learned: false,
    masteryLevel: 'new',
    favourite: false,
  },
  {
    id: 'seed-vocab-3',
    expression: 'meticulous',
    category: 'vocabulary',
    meaning: 'Showing extreme care and attention to small details.',
    example: 'Her meticulous notes made revising difficult idioms much faster.',
    contextSentence: 'Careful, meticulous reading builds a natural instinct for tone and structure.',
    sourceTitle: 'The Quiet Craft of Slow Reading',
    sourceUrl: 'https://aeon.co/essays/slow-reading',
    dateAdded: '2026-11-17T16:20:00.000Z',
    learned: false,
    masteryLevel: 'learning',
    favourite: false,
  },
  {
    id: 'seed-vocab-4',
    expression: 'ephemeral',
    category: 'vocabulary',
    meaning: 'Lasting for only a very short period of time.',
    example: 'Most viral internet trends turn out to be ephemeral.',
    contextSentence: 'Even if an online trend feels ephemeral, careful reading habits stay with you.',
    sourceTitle: 'The Quiet Craft of Slow Reading',
    sourceUrl: 'https://aeon.co/essays/slow-reading',
    dateAdded: '2026-11-17T11:10:00.000Z',
    learned: false,
    masteryLevel: 'new',
    favourite: false,
  },
  {
    id: 'seed-idiom-1',
    expression: 'break the ice',
    category: 'idioms',
    meaning: 'To say or do something that makes people feel relaxed and comfortable in a new situation.',
    example: 'The teacher shared a light-hearted story to break the ice on the first day of class.',
    contextSentence: 'Starting with a simple question often helps break the ice before a formal debate.',
    sourceTitle: 'The Art of Conversation — Sample Essay',
    sourceUrl: 'https://medium.com/example',
    dateAdded: '2026-11-17T14:30:00.000Z',
    learned: true,
    masteryLevel: 'mastered',
    favourite: false,
    reviewCount: 2,
    reviewIntervalDays: 14,
    lastReviewedAt: '2026-11-19T14:30:00.000Z',
    nextReviewAt: '2026-12-03T14:30:00.000Z',
  },
  {
    id: 'seed-idiom-2',
    expression: 'a blessing in disguise',
    category: 'idioms',
    meaning: 'Something that seems bad or unlucky at first but leads to a good result later.',
    example: 'Missing the early train turned out to be a blessing in disguise when I met my mentor at the station.',
    contextSentence: 'A difficult sentence is often a blessing in disguise because pausing fixes it in memory.',
    sourceTitle: 'The Quiet Craft of Slow Reading',
    sourceUrl: 'https://aeon.co/essays/slow-reading',
    dateAdded: '2026-11-16T20:05:00.000Z',
    learned: false,
    masteryLevel: 'new',
    favourite: false,
  },
  {
    id: 'seed-phrasal-1',
    expression: 'come across',
    category: 'phrasalVerbs',
    meaning: 'To find or meet something or someone by chance.',
    example: 'I came across an interesting word while reading the morning newspaper.',
    contextSentence: 'Whenever you come across an unfamiliar expression in an essay, note it immediately.',
    sourceTitle: 'Reading Deeply — Sample Essay',
    sourceUrl: 'https://substack.com/example',
    dateAdded: '2026-11-16T18:45:00.000Z',
    learned: false,
    masteryLevel: 'new',
    favourite: false,
  },
  {
    id: 'seed-phrasal-2',
    expression: 'put off',
    category: 'phrasalVerbs',
    meaning: 'To postpone or delay doing something until a later time.',
    example: 'Do not put off practising reading comprehension until the week before the exam.',
    contextSentence: 'Most students today put off deep reading until the final weeks before an exam.',
    sourceTitle: 'The Quiet Craft of Slow Reading',
    sourceUrl: 'https://aeon.co/essays/slow-reading',
    dateAdded: '2026-11-16T15:00:00.000Z',
    learned: false,
    masteryLevel: 'learning',
    favourite: false,
    missCount: 2,
    lastMissedAt: '2026-11-19T15:00:00.000Z',
    reviewCount: 1,
    reviewIntervalDays: 1,
    nextReviewAt: '2026-11-19T15:00:00.000Z',
  },
];
