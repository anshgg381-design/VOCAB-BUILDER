export type Category = 'vocabulary' | 'idioms' | 'phrasalVerbs';

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
  favourite: boolean;
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

export function buildExportJson(entries: VocabEntry[]) {
  return {
    app: 'CUET Vocabulary Builder',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: getCategoryCounts(entries),
    entries: entries.map((e) => ({
      id: e.id,
      expression: e.expression,
      category: e.category,
      meaning: e.meaning,
      example: e.example,
      contextSentence: e.contextSentence,
      sourceTitle: e.sourceTitle,
      sourceUrl: e.sourceUrl,
      dateAdded: e.dateAdded,
      learned: e.learned,
      favourite: e.favourite,
    })),
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
      learned: Boolean(r.learned),
      favourite: Boolean(r.favourite),
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
  const headers = ['Expression', 'Category', 'Meaning', 'Example', 'Date Added', 'Learned', 'Favourite'];
  const lines = [headers.map(escapeCsvCell).join(',')];

  for (const e of entries) {
    lines.push(
      [
        e.expression,
        CATEGORIES[e.category],
        e.meaning,
        e.example,
        formatDate(e.dateAdded),
        e.learned ? 'Yes' : 'No',
        e.favourite ? 'Yes' : 'No',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  return lines.join('\r\n');
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
    favourite: true,
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
    favourite: false,
  },
];
