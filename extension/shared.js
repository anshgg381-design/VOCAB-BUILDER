/* CUET Vocabulary Builder — Shared pure utilities (browser, service worker & Node) */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CUETShared = api;
})(typeof globalThis !== 'undefined' ? globalThis : self, function () {
  'use strict';

  const CATEGORIES = {
    vocabulary: 'Vocabulary',
    idioms: 'Idioms',
    phrasalVerbs: 'Phrasal Verbs',
  };

  const CATEGORY_SINGULAR = {
    vocabulary: 'Word',
    idioms: 'Idiom',
    phrasalVerbs: 'Phrasal Verb',
  };

  const VALID_CATEGORIES = ['vocabulary', 'idioms', 'phrasalVerbs'];

  const VALID_MASTERY_LEVELS = ['new', 'learning', 'mastered'];

  const MASTERY_LABELS = {
    new: 'New',
    learning: 'Learning',
    mastered: 'Mastered',
  };

  const GEMINI_MODEL = 'gemini-3.1-flash-lite';

  const GEMINI_MODELS = [
    { id: GEMINI_MODEL, label: 'Gemini 3.1 Flash Lite' },
  ];

  const SHEET_TABS = {
    vocabulary: 'Words',
    idioms: 'Idioms',
    phrasalVerbs: 'Phrasal Verbs',
  };

  const QUIZ_MIN_QUESTIONS = 5;
  const QUIZ_MAX_QUESTIONS = 20;
  const DEFAULT_DAILY_GOAL = 5;
  const MIN_DAILY_GOAL = 1;
  const MAX_DAILY_GOAL = 50;

  const DEFAULT_SETTINGS = {
    apiKey: '',
    model: GEMINI_MODEL,
    sheetWebhookUrl: '',
    dailyGoalTarget: DEFAULT_DAILY_GOAL,
    inPageHighlighter: true,
    themeMode: 'light',
    examConfig: null,
  };

  const PHRASAL_PARTICLES = new Set([
    'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'away', 'back',
    'through', 'across', 'along', 'around', 'about', 'after', 'against',
    'apart', 'aside', 'by', 'for', 'forward', 'into', 'onto', 'round',
    'to', 'with', 'without', 'ahead', 'forth', 'together', 'upon', 'of',
  ]);

  const PHRASAL_VERBS_HEADS = new Set([
    'act', 'acted', 'acting', 'acts',
    'add', 'added', 'adding', 'adds',
    'ask', 'asked', 'asking', 'asks',
    'back', 'backed', 'backing', 'backs',
    'bail', 'bailed', 'bailing', 'bails',
    'bank', 'banked', 'banking', 'banks',
    'bear', 'bore', 'borne', 'bearing', 'bears',
    'beat', 'beaten', 'beating', 'beats',
    'blow', 'blew', 'blown', 'blowing', 'blows',
    'boil', 'boiled', 'boiling', 'boils',
    'branch', 'branched', 'branching', 'branches',
    'break', 'broke', 'broken', 'breaking', 'breaks',
    'bring', 'brought', 'bringing', 'brings',
    'brush', 'brushed', 'brushing', 'brushes',
    'build', 'built', 'building', 'builds',
    'burn', 'burned', 'burnt', 'burning', 'burns',
    'call', 'called', 'calling', 'calls',
    'calm', 'calmed', 'calming', 'calms',
    'care', 'cared', 'caring', 'cares',
    'carry', 'carried', 'carrying', 'carries',
    'catch', 'caught', 'catching', 'catches',
    'check', 'checked', 'checking', 'checks',
    'cheer', 'cheered', 'cheering', 'cheers',
    'chip', 'chipped', 'chipping', 'chips',
    'clamp', 'clamped', 'clamping', 'clamps',
    'clean', 'cleaned', 'cleaning', 'cleans',
    'clear', 'cleared', 'clearing', 'clears',
    'close', 'closed', 'closing', 'closes',
    'come', 'came', 'coming', 'comes',
    'count', 'counted', 'counting', 'counts',
    'crack', 'cracked', 'cracking', 'cracks',
    'cross', 'crossed', 'crossing', 'crosses',
    'cut', 'cutting', 'cuts',
    'deal', 'dealt', 'dealing', 'deals',
    'die', 'died', 'dying', 'dies',
    'dig', 'dug', 'digging', 'digs',
    'do', 'did', 'done', 'doing', 'does',
    'drag', 'dragged', 'dragging', 'drags',
    'draw', 'drew', 'drawn', 'drawing', 'draws',
    'dress', 'dressed', 'dressing', 'dresses',
    'drift', 'drifted', 'drifting', 'drifts',
    'drop', 'dropped', 'dropping', 'drops',
    'dry', 'dried', 'drying', 'dries',
    'ease', 'eased', 'easing', 'eases',
    'eat', 'ate', 'eaten', 'eating', 'eats',
    'end', 'ended', 'ending', 'ends',
    'face', 'faced', 'facing', 'faces',
    'fade', 'faded', 'fading', 'fades',
    'fall', 'fell', 'fallen', 'falling', 'falls',
    'feel', 'felt', 'feeling', 'feels',
    'fend', 'fended', 'fending', 'fends',
    'figure', 'figured', 'figuring', 'figures',
    'fill', 'filled', 'filling', 'fills',
    'find', 'found', 'finding', 'finds',
    'finish', 'finished', 'finishing', 'finishes',
    'fit', 'fitted', 'fitting', 'fits',
    'fix', 'fixed', 'fixing', 'fixes',
    'follow', 'followed', 'following', 'follows',
    'freak', 'freaked', 'freaking', 'freaks',
    'get', 'got', 'gotten', 'getting', 'gets',
    'give', 'gave', 'given', 'giving', 'gives',
    'go', 'went', 'gone', 'going', 'goes',
    'grow', 'grew', 'grown', 'growing', 'grows',
    'hand', 'handed', 'handing', 'hands',
    'hang', 'hung', 'hanged', 'hanging', 'hangs',
    'head', 'headed', 'heading', 'heads',
    'hear', 'heard', 'hearing', 'hears',
    'help', 'helped', 'helping', 'helps',
    'hinge', 'hinged', 'hinging', 'hinges',
    'hit', 'hitting', 'hits',
    'hold', 'held', 'holding', 'holds',
    'iron', 'ironed', 'ironing', 'irons',
    'join', 'joined', 'joining', 'joins',
    'jot', 'jotted', 'jotting', 'jots',
    'jump', 'jumped', 'jumping', 'jumps',
    'keep', 'kept', 'keeping', 'keeps',
    'kick', 'kicked', 'kicking', 'kicks',
    'knock', 'knocked', 'knocking', 'knocks',
    'lash', 'lashed', 'lashing', 'lashes',
    'laugh', 'laughed', 'laughing', 'laughs',
    'lay', 'laid', 'laying', 'lays',
    'lead', 'led', 'leading', 'leads',
    'lean', 'leaned', 'leant', 'leaning', 'leans',
    'leave', 'left', 'leaving', 'leaves',
    'let', 'letting', 'lets',
    'lie', 'lay', 'lain', 'lying', 'lies',
    'light', 'lit', 'lighted', 'lighting', 'lights',
    'line', 'lined', 'lining', 'lines',
    'live', 'lived', 'living', 'lives',
    'lock', 'locked', 'locking', 'locks',
    'log', 'logged', 'logging', 'logs',
    'look', 'looked', 'looking', 'looks',
    'make', 'made', 'making', 'makes',
    'map', 'mapped', 'mapping', 'maps',
    'mark', 'marked', 'marking', 'marks',
    'meet', 'met', 'meeting', 'meets',
    'mess', 'messed', 'messing', 'messes',
    'miss', 'missed', 'missing', 'misses',
    'mix', 'mixed', 'mixing', 'mixes',
    'move', 'moved', 'moving', 'moves',
    'mull', 'mulled', 'mulling', 'mulls',
    'narrow', 'narrowed', 'narrowing', 'narrows',
    'nod', 'nodded', 'nodding', 'nods',
    'open', 'opened', 'opening', 'opens',
    'opt', 'opted', 'opting', 'opts',
    'own', 'owned', 'owning', 'owns',
    'pack', 'packed', 'packing', 'packs',
    'pan', 'panned', 'panning', 'pans',
    'pass', 'passed', 'passing', 'passes',
    'patch', 'patched', 'patching', 'patches',
    'pay', 'paid', 'paying', 'pays',
    'phase', 'phased', 'phasing', 'phases',
    'pick', 'picked', 'picking', 'picks',
    'pile', 'piled', 'piling', 'piles',
    'pin', 'pinned', 'pinning', 'pins',
    'pitch', 'pitched', 'pitching', 'pitches',
    'plan', 'planned', 'planning', 'plans',
    'play', 'played', 'playing', 'plays',
    'plug', 'plugged', 'plugging', 'plugs',
    'point', 'pointed', 'pointing', 'points',
    'polish', 'polished', 'polishing', 'polishes',
    'pop', 'popped', 'popping', 'pops',
    'pour', 'poured', 'pouring', 'pours',
    'press', 'pressed', 'pressing', 'presses',
    'pull', 'pulled', 'pulling', 'pulls',
    'push', 'pushed', 'pushing', 'pushes',
    'put', 'putting', 'puts',
    'ramp', 'ramped', 'ramping', 'ramps',
    'reach', 'reached', 'reaching', 'reaches',
    'read', 'reading', 'reads',
    'reel', 'reeled', 'reeling', 'reels',
    'rely', 'relied', 'relying', 'relies',
    'ring', 'rang', 'rung', 'ringing', 'rings',
    'rip', 'ripped', 'ripping', 'rips',
    'roll', 'rolled', 'rolling', 'rolls',
    'root', 'rooted', 'rooting', 'roots',
    'round', 'rounded', 'rounding', 'rounds',
    'rub', 'rubbed', 'rubbing', 'rubs',
    'rule', 'ruled', 'ruling', 'rules',
    'run', 'ran', 'running', 'runs',
    'rush', 'rushed', 'rushing', 'rushes',
    'scale', 'scaled', 'scaling', 'scales',
    'scrape', 'scraped', 'scraping', 'scrapes',
    'see', 'saw', 'seen', 'seeing', 'sees',
    'seek', 'sought', 'seeking', 'seeks',
    'sell', 'sold', 'selling', 'sells',
    'send', 'sent', 'sending', 'sends',
    'set', 'setting', 'sets',
    'settle', 'settled', 'settling', 'settles',
    'shake', 'shook', 'shaken', 'shaking', 'shakes',
    'shell', 'shelled', 'shelling', 'shells',
    'shift', 'shifted', 'shifting', 'shifts',
    'shoot', 'shot', 'shooting', 'shoots',
    'shop', 'shopped', 'shopping', 'shops',
    'show', 'showed', 'shown', 'showing', 'shows',
    'shrug', 'shrugged', 'shrugging', 'shrugs',
    'shut', 'shutting', 'shuts',
    'sign', 'signed', 'signing', 'signs',
    'single', 'singled', 'singling', 'singles',
    'sink', 'sank', 'sunk', 'sinking', 'sinks',
    'sit', 'sat', 'sitting', 'sits',
    'size', 'sized', 'sizing', 'sizes',
    'sleep', 'slept', 'sleeping', 'sleeps',
    'slip', 'slipped', 'slipping', 'slips',
    'slow', 'slowed', 'slowing', 'slows',
    'snap', 'snapped', 'snapping', 'snaps',
    'sneak', 'sneaked', 'snuck', 'sneaking', 'sneaks',
    'soak', 'soaked', 'soaking', 'soaks',
    'sort', 'sorted', 'sorting', 'sorts',
    'spark', 'sparked', 'sparking', 'sparks',
    'speak', 'spoke', 'spoken', 'speaking', 'speaks',
    'speed', 'sped', 'speeding', 'speeds',
    'spell', 'spelled', 'spelt', 'spelling', 'spells',
    'spin', 'spun', 'spinning', 'spins',
    'split', 'splitting', 'splits',
    'spread', 'spreading', 'spreads',
    'spring', 'sprang', 'sprung', 'springing', 'springs',
    'stamp', 'stamped', 'stamping', 'stamps',
    'stand', 'stood', 'standing', 'stands',
    'start', 'started', 'starting', 'starts',
    'stave', 'staved', 'stove', 'staving', 'staves',
    'stay', 'stayed', 'staying', 'stays',
    'stem', 'stemmed', 'stemming', 'stems',
    'step', 'stepped', 'stepping', 'steps',
    'stick', 'stuck', 'sticking', 'sticks',
    'stir', 'stirred', 'stirring', 'stirs',
    'stock', 'stocked', 'stocking', 'stocks',
    'stop', 'stopped', 'stopping', 'stops',
    'strike', 'struck', 'striking', 'strikes',
    'strip', 'stripped', 'stripping', 'strips',
    'stumble', 'stumbled', 'stumbling', 'stumbles',
    'sum', 'summed', 'summing', 'sums',
    'sweep', 'swept', 'sweeping', 'sweeps',
    'switch', 'switched', 'switching', 'switches',
    'take', 'took', 'taken', 'taking', 'takes',
    'talk', 'talked', 'talking', 'talks',
    'taper', 'tapered', 'tapering', 'tapers',
    'tear', 'tore', 'torn', 'tearing', 'tears',
    'tell', 'told', 'telling', 'tells',
    'think', 'thought', 'thinking', 'thinks',
    'throw', 'threw', 'thrown', 'throwing', 'throws',
    'tick', 'ticked', 'ticking', 'ticks',
    'tide', 'tided', 'tiding', 'tides',
    'tie', 'tied', 'tying', 'ties',
    'tip', 'tipped', 'tipping', 'tips',
    'tone', 'toned', 'toning', 'tones',
    'top', 'topped', 'topping', 'tops',
    'touch', 'touched', 'touching', 'touches',
    'track', 'tracked', 'tracking', 'tracks',
    'trade', 'traded', 'trading', 'trades',
    'trip', 'tripped', 'tripping', 'trips',
    'try', 'tried', 'trying', 'tries',
    'tuck', 'tucked', 'tucking', 'tucks',
    'tune', 'tuned', 'tuning', 'tunes',
    'turn', 'turned', 'turning', 'turns',
    'use', 'used', 'using', 'uses',
    'usher', 'ushered', 'ushering', 'ushers',
    'veer', 'veered', 'veering', 'veers',
    'vouch', 'vouched', 'vouching', 'vouches',
    'wait', 'waited', 'waiting', 'waits',
    'wake', 'woke', 'woken', 'waking', 'wakes',
    'walk', 'walked', 'walking', 'walks',
    'ward', 'warded', 'warding', 'wards',
    'warm', 'warmed', 'warming', 'warms',
    'wash', 'washed', 'washing', 'washes',
    'watch', 'watched', 'watching', 'watches',
    'water', 'watered', 'watering', 'waters',
    'wear', 'wore', 'worn', 'wearing', 'wears',
    'weed', 'weeded', 'weeding', 'weeds',
    'weigh', 'weighed', 'weighing', 'weighs',
    'whip', 'whipped', 'whipping', 'whips',
    'win', 'won', 'winning', 'wins',
    'wind', 'wound', 'winding', 'winds',
    'wipe', 'wiped', 'wiping', 'wipes',
    'work', 'worked', 'working', 'works',
    'wrap', 'wrapped', 'wrapping', 'wraps',
    'write', 'wrote', 'written', 'writing', 'writes',
    'yield', 'yielded', 'yielding', 'yields',
    'zero', 'zeroed', 'zeroing', 'zeroes',
    'zone', 'zoned', 'zoning', 'zones',
    'zoom', 'zoomed', 'zooming', 'zooms',
  ]);

  function normalizeExpression(raw) {
    if (typeof raw !== 'string') return '';
    return raw
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/^[\s"'`“”‘’(\[{•\-–—*.,;:!?]+/, '')
      .replace(/[\s"'`“”‘’)\]}.,;:!?]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeKey(raw) {
    return normalizeExpression(raw).toLowerCase();
  }

  function detectCategory(rawExpression) {
    const cleaned = normalizeExpression(rawExpression);
    if (!cleaned) return 'vocabulary';

    const tokens = cleaned
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/g, ''))
      .filter(Boolean);

    if (tokens.length <= 1) {
      return 'vocabulary';
    }

    // 2-word phrasal verb: e.g. "come across", "put off", "give up"
    if (tokens.length === 2) {
      if (PHRASAL_VERBS_HEADS.has(tokens[0]) && PHRASAL_PARTICLES.has(tokens[1])) {
        return 'phrasalVerbs';
      }
      return 'idioms';
    }

    // 3-word phrasal verb: e.g. "look forward to", "put up with", "run out of", "get away with"
    if (tokens.length === 3) {
      if (
        PHRASAL_VERBS_HEADS.has(tokens[0]) &&
        PHRASAL_PARTICLES.has(tokens[1]) &&
        PHRASAL_PARTICLES.has(tokens[2])
      ) {
        return 'phrasalVerbs';
      }
      // Special common 3-word phrasal verbs like "get rid of", "make sense of", "take care of"
      if (
        tokens[0] === 'get' && tokens[1] === 'rid' && tokens[2] === 'of'
      ) {
        return 'phrasalVerbs';
      }
      return 'idioms';
    }

    return 'idioms';
  }

  function parseBulkInput(rawText) {
    if (typeof rawText !== 'string') return [];
    const pieces = rawText.split(/[\r\n,]+/);
    const seen = new Set();
    const results = [];

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

  function extractContextSentence(fullText, selectedText) {
    if (typeof fullText !== 'string' || typeof selectedText !== 'string') return '';
    const cleanFull = fullText.replace(/\s+/g, ' ').trim();
    const cleanSelected = selectedText.replace(/\s+/g, ' ').trim();
    if (!cleanFull || !cleanSelected) return '';

    const lowerFull = cleanFull.toLowerCase();
    const lowerSel = cleanSelected.toLowerCase();
    const idx = lowerFull.indexOf(lowerSel);
    if (idx === -1) {
      return cleanFull.length > 360 ? cleanFull.slice(0, 360).trim() : cleanFull;
    }

    // Walk backward to sentence boundary
    let start = idx;
    while (start > 0) {
      const ch = cleanFull[start - 1];
      if ((ch === '.' || ch === '!' || ch === '?') && /\s/.test(cleanFull[start] || ' ')) {
        break;
      }
      if (idx - start > 220) break;
      start--;
    }

    // Walk forward to sentence boundary
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

  function findDuplicate(entries, expression) {
    const key = normalizeKey(expression);
    if (!key || !Array.isArray(entries)) return null;
    return entries.find((entry) => normalizeKey(entry.expression) === key) || null;
  }

  function getCategoryCounts(entries) {
    const counts = { vocabulary: 0, idioms: 0, phrasalVerbs: 0, total: 0 };
    if (!Array.isArray(entries)) return counts;
    for (const entry of entries) {
      if (entry.category === 'vocabulary') counts.vocabulary++;
      else if (entry.category === 'idioms') counts.idioms++;
      else if (entry.category === 'phrasalVerbs') counts.phrasalVerbs++;
    }
    counts.total = counts.vocabulary + counts.idioms + counts.phrasalVerbs;
    return counts;
  }

  function getMasteryLevel(entry) {
    if (entry && VALID_MASTERY_LEVELS.includes(entry.masteryLevel)) {
      return entry.masteryLevel;
    }
    return entry && entry.learned ? 'mastered' : 'new';
  }

  function getMasteryStats(entries) {
    const list = Array.isArray(entries) ? entries : [];
    let newCount = 0;
    let learningCount = 0;
    let masteredCount = 0;

    for (const entry of list) {
      const level = getMasteryLevel(entry);
      if (level === 'mastered') masteredCount++;
      else if (level === 'learning') learningCount++;
      else newCount++;
    }

    const total = list.length;
    const percentMastered = total === 0 ? 0 : Math.round((masteredCount / total) * 100);
    const percentLearning = total === 0 ? 0 : Math.round((learningCount / total) * 100);

    return {
      total,
      newCount,
      learningCount,
      masteredCount,
      percentMastered,
      percentLearning,
    };
  }

  const MASTERY_BADGES = [
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

  function getMasteryBadgeProgress(entries) {
    const stats = getMasteryStats(entries);
    const masteredCount = stats.masteredCount;
    const badges = MASTERY_BADGES.map((badge) => {
      const unlocked = masteredCount >= badge.threshold;
      const remaining = Math.max(0, badge.threshold - masteredCount);
      const progressPercent = Math.min(100, Math.round((masteredCount / badge.threshold) * 100));
      return {
        id: badge.id,
        title: badge.title,
        threshold: badge.threshold,
        description: badge.description,
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

  const DAY_MS = 24 * 60 * 60 * 1000;

  function getReviewIntervalDays(masteryLevel, reviewCount) {
    const safeCount =
      typeof reviewCount === 'number' && Number.isFinite(reviewCount) && reviewCount > 0
        ? Math.floor(reviewCount)
        : 0;
    if (masteryLevel === 'new') return 1;
    if (masteryLevel === 'learning') return safeCount >= 2 ? 4 : 3;
    if (safeCount >= 3) return 30;
    if (safeCount === 2) return 14;
    return 7;
  }

  function createInitialReviewSchedule(now) {
    const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
    return {
      lastReviewedAt: safeNow.toISOString(),
      reviewCount: 0,
      reviewIntervalDays: 1,
      nextReviewAt: new Date(safeNow.getTime() + DAY_MS).toISOString(),
    };
  }

  function previewReviewIntervals(entry) {
    const currentCount =
      entry && typeof entry.reviewCount === 'number' && Number.isFinite(entry.reviewCount) && entry.reviewCount >= 0
        ? Math.floor(entry.reviewCount)
        : 0;
    const nextCount = currentCount + 1;
    return {
      needsReviewDays: getReviewIntervalDays('learning', nextCount),
      masteredDays: getReviewIntervalDays('mastered', nextCount),
    };
  }

  function calculateReviewPatch(entry, nextMastery, options) {
    const opts = options || {};
    const now =
      opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();
    const currentCount =
      entry && typeof entry.reviewCount === 'number' && Number.isFinite(entry.reviewCount) && entry.reviewCount >= 0
        ? Math.floor(entry.reviewCount)
        : 0;

    let nextCount;
    if (nextMastery === 'new') {
      nextCount = 0;
    } else if (opts.countAsReview === false) {
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

  function getEntryReviewSchedule(entry, now) {
    const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
    const masteryLevel = getMasteryLevel(entry || {});
    const reviewCount =
      entry && typeof entry.reviewCount === 'number' && Number.isFinite(entry.reviewCount) && entry.reviewCount >= 0
        ? Math.floor(entry.reviewCount)
        : 0;
    const intervalDays =
      entry &&
      typeof entry.reviewIntervalDays === 'number' &&
      Number.isFinite(entry.reviewIntervalDays) &&
      entry.reviewIntervalDays > 0
        ? Math.round(entry.reviewIntervalDays)
        : getReviewIntervalDays(masteryLevel, reviewCount);

    let nextReviewAt;
    if (entry && typeof entry.nextReviewAt === 'string' && !Number.isNaN(Date.parse(entry.nextReviewAt))) {
      nextReviewAt = entry.nextReviewAt;
    } else {
      const anchorStr =
        entry && typeof entry.lastReviewedAt === 'string' && !Number.isNaN(Date.parse(entry.lastReviewedAt))
          ? entry.lastReviewedAt
          : entry && entry.dateAdded;
      const anchorMs = Date.parse(anchorStr || '');
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

    let scheduleLabel;
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

  function getDailyReviewQueue(entries, now) {
    const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
    const list = Array.isArray(entries) ? entries : [];
    const priority = { new: 0, learning: 1, mastered: 2 };
    const dueItems = [];
    const upcomingItems = [];

    for (const entry of list) {
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
      return Date.parse(a.entry.dateAdded || '') - Date.parse(b.entry.dateAdded || '');
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

  function getStudyMasteryForOutcome(outcome) {
    return outcome === 'known' ? 'mastered' : 'learning';
  }

  function buildStudyDeck(entries, scope, now) {
    const list = Array.isArray(entries) ? entries : [];
    const targetScope = scope || 'all';
    if (targetScope === 'dailyReview') {
      return getDailyReviewQueue(list, now).dueEntries;
    }

    let filtered;
    if (targetScope === 'all') {
      filtered = [...list];
    } else if (targetScope === 'needsReview') {
      filtered = list.filter((e) => getMasteryLevel(e) !== 'mastered');
    } else {
      filtered = list.filter((e) => e.category === targetScope);
    }

    const priority = { new: 0, learning: 1, mastered: 2 };
    return filtered.sort((a, b) => {
      const pa = priority[getMasteryLevel(a)];
      const pb = priority[getMasteryLevel(b)];
      if (pa !== pb) return pa - pb;
      return Date.parse(b.dateAdded || '') - Date.parse(a.dateAdded || '');
    });
  }

  const FALLBACK_QUIZ_DISTRACTORS = [
    'Happening occasionally without any clear pattern or plan.',
    'To delay a decision until more reliable facts are available.',
    'Showing calm patience when facing a sudden setback.',
    'To explain a complex rule in a brief, direct manner.',
    'Relating to ideas that are based on theory rather than everyday practice.',
    'To withdraw quietly from an agreement or public discussion.',
  ];

  function shuffleWithRng(items, rng) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function getQuizEligibleEntries(entries) {
    const list = Array.isArray(entries) ? entries : [];
    return list.filter((e) => {
      const level = getMasteryLevel(e);
      return level === 'new' || level === 'learning';
    });
  }

  function generateQuizQuestions(allEntries, options) {
    const opts = options || {};
    const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
    const list = Array.isArray(allEntries) ? allEntries : [];
    const eligible = getQuizEligibleEntries(list);

    if (eligible.length < QUIZ_MIN_QUESTIONS) {
      return {
        ok: false,
        error: `You need at least ${QUIZ_MIN_QUESTIONS} "New" or "Learning" entries to start a quiz (currently ${eligible.length}).`,
      };
    }

    let chosen;
    if (opts.mode === 'custom') {
      const idSet = new Set(Array.isArray(opts.selectedIds) ? opts.selectedIds : []);
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
      const requested = typeof opts.count === 'number' ? Math.round(opts.count) : QUIZ_MIN_QUESTIONS;
      const clampedCount = Math.max(QUIZ_MIN_QUESTIONS, Math.min(maxAllowed, requested));
      chosen = shuffleWithRng(eligible, rng).slice(0, clampedCount);
    }

    const questions = chosen.map((entry, idx) => {
      const correctMeaning = String(entry.meaning || '').trim();
      const seenMeanings = new Set([correctMeaning.toLowerCase()]);

      const sameCatPool = shuffleWithRng(
        list.filter((other) => other.id !== entry.id && other.category === entry.category),
        rng
      );
      const otherCatPool = shuffleWithRng(
        list.filter((other) => other.id !== entry.id && other.category !== entry.category),
        rng
      );

      const distractors = [];
      for (const candidate of [...sameCatPool, ...otherCatPool]) {
        if (distractors.length >= 3) break;
        const m = String(candidate.meaning || '').trim();
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

  function getLocalDateKey(input) {
    const date = input instanceof Date ? input : new Date(input || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function clampDailyGoal(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return DEFAULT_DAILY_GOAL;
    return Math.max(MIN_DAILY_GOAL, Math.min(MAX_DAILY_GOAL, Math.round(num)));
  }

  function computeDailyGoalStats(entries, rawTarget, now) {
    const refNow = now instanceof Date ? now : new Date();
    const target = clampDailyGoal(rawTarget);
    const countsByDay = new Map();

    for (const entry of entries || []) {
      const key = getLocalDateKey(entry.dateAdded);
      if (!key) continue;
      countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    }

    const todayKey = getLocalDateKey(refNow);
    const savedToday = countsByDay.get(todayKey) || 0;
    const goalReached = savedToday >= target;
    const progressPercent = Math.min(100, Math.round((savedToday / target) * 100));

    let streakDays = 0;
    const cursor = new Date(refNow.getFullYear(), refNow.getMonth(), refNow.getDate());
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

  function buildGeminiPrompt(expression, category, contextSentence) {
    const categoryLabel = CATEGORY_SINGULAR[category] || 'Expression';
    const hasContext = Boolean(contextSentence && contextSentence.trim().length > 0);
    const contextBlock = hasContext
      ? `Context sentence from the article: "${contextSentence.trim()}"`
      : 'Context sentence: None provided. Use the most common everyday meaning in standard English.';

    const typeInstruction =
      category === 'idioms' || category === 'phrasalVerbs'
        ? `This is an English ${categoryLabel.toLowerCase()}. Explain the meaning of the entire expression as a whole — do NOT define the individual words separately.`
        : 'This is an English vocabulary word. If it has multiple meanings, explain ONLY the single meaning that fits the context (or the most common meaning if no context is given).';

    return [
      `Analyse this English ${categoryLabel.toLowerCase()} for a CUET UG 2027 student:`,
      `Expression: "${expression}"`,
      contextBlock,
      typeInstruction,
      '',
      'Strict rules:',
      '1. Return ONLY a JSON object with exactly three string keys: "expression", "meaning", "example".',
      '2. "expression": The exact cleaned word, idiom, or phrasal verb.',
      '3. "meaning": One concise, accurate explanation in simple, easy-to-understand English. Do NOT list multiple meanings, synonyms, antonyms, grammar labels, or extra notes.',
      '4. "example": Exactly ONE original, natural English sentence demonstrating how the expression is used correctly.',
      '5. Do NOT include any extra keys, markdown formatting, or commentary.',
    ].join('\n');
  }

  function parseGeminiResponse(rawText, fallbackExpression) {
    if (typeof rawText !== 'string' || !rawText.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    let cleaned = rawText.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    } else {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new Error('Could not read a valid JSON analysis from Gemini.');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Gemini response did not match the expected structure.');
    }

    const expression = normalizeExpression(
      typeof parsed.expression === 'string' && parsed.expression.trim()
        ? parsed.expression
        : fallbackExpression || ''
    );
    const meaning = typeof parsed.meaning === 'string' ? parsed.meaning.replace(/\s+/g, ' ').trim() : '';
    const example = typeof parsed.example === 'string'
      ? parsed.example.split(/\r?\n/)[0].replace(/\s+/g, ' ').trim()
      : '';

    if (!expression || !meaning || !example) {
      throw new Error('Gemini response was missing expression, meaning, or example.');
    }

    // Strictly return ONLY the 3 required fields
    return { expression, meaning, example };
  }

  function sanitizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const expression = normalizeExpression(String(raw.expression || ''));
    const meaning = typeof raw.meaning === 'string' ? raw.meaning.trim() : '';
    const example = typeof raw.example === 'string' ? raw.example.trim() : '';
    if (!expression || !meaning || !example) return null;

    const category = VALID_CATEGORIES.includes(raw.category)
      ? raw.category
      : detectCategory(expression);

    const dateAdded =
      typeof raw.dateAdded === 'string' && !Number.isNaN(Date.parse(raw.dateAdded))
        ? raw.dateAdded
        : new Date().toISOString();

    const masteryLevel = VALID_MASTERY_LEVELS.includes(raw.masteryLevel)
      ? raw.masteryLevel
      : raw.learned
        ? 'mastered'
        : 'new';

    return {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateId(),
      expression,
      category,
      meaning,
      example,
      contextSentence: typeof raw.contextSentence === 'string' ? raw.contextSentence.trim() : '',
      sourceTitle: typeof raw.sourceTitle === 'string' ? raw.sourceTitle.trim() : '',
      sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl.trim() : '',
      dateAdded,
      learned: masteryLevel === 'mastered',
      masteryLevel,
      favourite: Boolean(raw.favourite),
      ...(typeof raw.nextReviewAt === 'string' && !Number.isNaN(Date.parse(raw.nextReviewAt))
        ? { nextReviewAt: raw.nextReviewAt }
        : {}),
      ...(typeof raw.lastReviewedAt === 'string' && !Number.isNaN(Date.parse(raw.lastReviewedAt))
        ? { lastReviewedAt: raw.lastReviewedAt }
        : {}),
      ...(typeof raw.reviewIntervalDays === 'number' && raw.reviewIntervalDays > 0
        ? { reviewIntervalDays: Math.round(raw.reviewIntervalDays) }
        : {}),
      ...(typeof raw.reviewCount === 'number' && raw.reviewCount >= 0
        ? { reviewCount: Math.floor(raw.reviewCount) }
        : {}),
      ...(typeof raw.missCount === 'number' && raw.missCount > 0
        ? { missCount: Math.floor(raw.missCount) }
        : {}),
      ...(typeof raw.lastMissedAt === 'string' && !Number.isNaN(Date.parse(raw.lastMissedAt))
        ? { lastMissedAt: raw.lastMissedAt }
        : {}),
    };
  }

  function buildExportJson(entries, settings) {
    const safeEntries = Array.isArray(entries)
      ? entries.map((e) => sanitizeEntry(e)).filter(Boolean)
      : [];

    // NEVER include apiKey in exported backups
    return {
      app: 'IPMAT/CUET VOCAB BUILDER',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      counts: getCategoryCounts(safeEntries),
      preferences: {
        model: GEMINI_MODEL,
      },
      entries: safeEntries,
    };
  }

  function validateAndMergeImport(existingEntries, payload) {
    if (!payload || typeof payload !== 'object') {
      return {
        ok: false,
        error: 'Invalid backup file: expected a JSON object.',
        mergedEntries: existingEntries || [],
        addedCount: 0,
        skippedCount: 0,
      };
    }

    let rawList = null;
    if (Array.isArray(payload.entries)) {
      rawList = payload.entries;
    } else if (
      Array.isArray(payload.vocabulary) ||
      Array.isArray(payload.idioms) ||
      Array.isArray(payload.phrasalVerbs)
    ) {
      rawList = [
        ...(Array.isArray(payload.vocabulary)
          ? payload.vocabulary.map((e) => ({ ...e, category: 'vocabulary' }))
          : []),
        ...(Array.isArray(payload.idioms)
          ? payload.idioms.map((e) => ({ ...e, category: 'idioms' }))
          : []),
        ...(Array.isArray(payload.phrasalVerbs)
          ? payload.phrasalVerbs.map((e) => ({ ...e, category: 'phrasalVerbs' }))
          : []),
      ];
    }

    if (!rawList) {
      return {
        ok: false,
        error: 'Invalid backup file: no entries list found.',
        mergedEntries: existingEntries || [],
        addedCount: 0,
        skippedCount: 0,
      };
    }

    const base = Array.isArray(existingEntries) ? [...existingEntries] : [];
    const existingKeys = new Set(base.map((e) => normalizeKey(e.expression)));
    const existingIds = new Set(base.map((e) => e.id));

    let addedCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;

    for (const rawItem of rawList) {
      const clean = sanitizeEntry(rawItem);
      if (!clean) {
        invalidCount++;
        continue;
      }
      const key = normalizeKey(clean.expression);
      if (existingKeys.has(key)) {
        skippedCount++;
        continue;
      }
      if (existingIds.has(clean.id)) {
        clean.id = generateId();
      }
      existingKeys.add(key);
      existingIds.add(clean.id);
      base.push(clean);
      addedCount++;
    }

    if (addedCount === 0 && skippedCount === 0 && invalidCount > 0) {
      return {
        ok: false,
        error: 'No valid vocabulary entries were found in this file.',
        mergedEntries: existingEntries || [],
        addedCount: 0,
        skippedCount: 0,
      };
    }

    return {
      ok: true,
      mergedEntries: base,
      addedCount,
      skippedCount,
      invalidCount,
    };
  }

  function escapeCsvCell(value) {
    const str = String(value == null ? '' : value);
    if (/[",\r\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function buildCsv(entries) {
    const headers = ['Word', 'Meaning', 'Example Sentence'];
    const lines = [headers.map(escapeCsvCell).join(',')];

    for (const entry of entries || []) {
      const row = [
        entry.expression || '',
        entry.meaning || '',
        entry.example || '',
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }

    return lines.join('\r\n');
  }

  function getCategoryInsightData(entries) {
    const list = Array.isArray(entries) ? entries : [];
    const meta = [
      { category: 'vocabulary', label: 'Words' },
      { category: 'idioms', label: 'Idioms' },
      { category: 'phrasalVerbs', label: 'Phrasal Verbs' },
    ];
    return meta.map((item) => {
      const subset = list.filter((e) => e.category === item.category);
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

  function getMasteryDistributionData(entries) {
    const stats = getMasteryStats(entries);
    const pct = (n) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0);
    return [
      { level: 'new', label: 'New', count: stats.newCount, percent: pct(stats.newCount) },
      { level: 'learning', label: 'Learning', count: stats.learningCount, percent: pct(stats.learningCount) },
      { level: 'mastered', label: 'Mastered', count: stats.masteredCount, percent: pct(stats.masteredCount) },
    ];
  }

  function formatEntryCopyText(entry) {
    if (!entry) return '';
    const expr = String(entry.expression || '').trim();
    const meaning = String(entry.meaning || '').trim();
    const example = String(entry.example || '').trim();
    return `${expr} — ${meaning}${example ? ` (Example: ${example})` : ''}`;
  }

  function getToolbarBadgeText(entries, dailyGoalTarget, now) {
    const stats = computeDailyGoalStats(entries, dailyGoalTarget, now);
    if (stats.savedToday <= 0) {
      return { text: '', isGoalReached: false };
    }
    return {
      text: stats.goalReached ? '✓' : String(stats.savedToday),
      isGoalReached: stats.goalReached,
    };
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'cuet_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sanitizeTsvCell(value) {
    return String(value == null ? '' : value)
      .replace(/\t+/g, ' ')
      .replace(/\r?\n+/g, ' ')
      .trim();
  }

  function buildAnkiTsv(entries) {
    const directives = ['#separator:tab', '#html:true', '#tags column:3'];
    const lines = [...directives];

    for (const entry of entries || []) {
      const expr = sanitizeTsvCell(entry.expression || '');
      if (!expr) continue;
      const meaning = escapeHtml(sanitizeTsvCell(entry.meaning || ''));
      const example = escapeHtml(sanitizeTsvCell(entry.example || ''));
      const front = escapeHtml(expr);
      const back =
        '<strong>Meaning:</strong> ' +
        meaning +
        (example ? '<br><br><strong>Example:</strong> ' + example : '');
      const catTag = entry.category === 'phrasalVerbs' ? 'phrasal_verbs' : (entry.category || 'vocabulary');
      const level = getMasteryLevel(entry);
      const tags = ['cuet', 'ipmat', catTag, level];
      if (entry.favourite) tags.push('favourite');
      lines.push([front, back, tags.join(' ')].join('\t'));
    }

    return lines.join('\n');
  }

  function mergePulledSheetEntries(existingEntries, pulledRows, nowIso) {
    const base = Array.isArray(existingEntries) ? existingEntries.map((e) => ({ ...e })) : [];
    const indexByKey = new Map();
    const existingIds = new Set();

    base.forEach((e, idx) => {
      const key = normalizeKey(e.expression);
      if (key && !indexByKey.has(key)) indexByKey.set(key, idx);
      if (e.id) existingIds.add(e.id);
    });

    const timestamp = nowIso && !Number.isNaN(Date.parse(nowIso)) ? nowIso : new Date().toISOString();
    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let skippedCount = 0;
    const seenIncoming = new Set();

    for (const row of pulledRows || []) {
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

      const resolvedCategory = VALID_CATEGORIES.includes(row.category)
        ? row.category
        : detectCategory(expression);

      if (indexByKey.has(key)) {
        const idx = indexByKey.get(key);
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
        const created = {
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
        };
        indexByKey.set(key, base.length);
        base.push(created);
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

  function getHighlightableEntries(entries) {
    return (Array.isArray(entries) ? entries : []).filter((entry) => {
      if (!entry || !entry.expression) return false;
      const level = getMasteryLevel(entry);
      return level === 'new' || level === 'learning';
    });
  }

  function escapeRegExp(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildHighlightMatcher(entries, maxTerms) {
    const limit = typeof maxTerms === 'number' && maxTerms > 0 ? maxTerms : 300;
    const active = getHighlightableEntries(entries);
    const map = Object.create(null);
    const terms = [];

    for (const entry of active) {
      const expr = normalizeExpression(entry.expression);
      const key = normalizeKey(expr);
      if (!expr || expr.length < 2 || !key || map[key]) continue;
      map[key] = {
        id: entry.id,
        expression: entry.expression,
        category: entry.category,
        meaning: entry.meaning,
        example: entry.example,
        masteryLevel: getMasteryLevel(entry),
      };
      terms.push(expr);
      if (terms.length >= limit) break;
    }

    if (terms.length === 0) {
      return { regex: null, map, count: 0 };
    }

    terms.sort((a, b) => b.length - a.length);
    const pattern = '\\b(' + terms.map((t) => escapeRegExp(t).replace(/\s+/g, '\\s+')).join('|') + ')\\b';
    return {
      regex: new RegExp(pattern, 'gi'),
      map,
      count: terms.length,
    };
  }

  function sanitizePdfAscii(text) {
    return String(text == null ? '' : text)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[\u2022\u00B7]/g, '|')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapePdfString(text) {
    return sanitizePdfAscii(text)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  function wrapPdfText(text, maxChars) {
    const clean = sanitizePdfAscii(text);
    if (!clean) return [''];
    const words = clean.split(' ');
    const lines = [];
    let current = '';

    for (const word of words) {
      if (word.length > maxChars) {
        if (current) {
          lines.push(current);
          current = '';
        }
        for (let i = 0; i < word.length; i += maxChars) {
          lines.push(word.slice(i, i + maxChars));
        }
        continue;
      }
      const next = current ? current + ' ' + word : word;
      if (next.length <= maxChars) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [''];
  }

  function buildPdfStudySheetPlan(entries, options) {
    const opts = options || {};
    const categoryFilter =
      opts.category && VALID_CATEGORIES.includes(opts.category) ? opts.category : 'all';
    const sortOrder = opts.sortOrder === 'za' || opts.sortOrder === 'recent' ? opts.sortOrder : 'az';
    const now = opts.now instanceof Date ? opts.now : new Date();

    const labels = {
      all: 'All Categories (Words, Idioms & Phrasal Verbs)',
      vocabulary: 'Vocabulary (Words)',
      idioms: 'Idioms',
      phrasalVerbs: 'Phrasal Verbs',
    };
    const slugs = {
      all: 'all-categories',
      vocabulary: 'words',
      idioms: 'idioms',
      phrasalVerbs: 'phrasal-verbs',
    };

    let filtered =
      categoryFilter === 'all'
        ? [...(entries || [])]
        : (entries || []).filter((e) => e.category === categoryFilter);

    if (sortOrder === 'az') {
      filtered.sort((a, b) => a.expression.localeCompare(b.expression, undefined, { sensitivity: 'base' }));
    } else if (sortOrder === 'za') {
      filtered.sort((a, b) => b.expression.localeCompare(a.expression, undefined, { sensitivity: 'base' }));
    } else {
      filtered.sort((a, b) => Date.parse(b.dateAdded || '') - Date.parse(a.dateAdded || ''));
    }

    const dateStamp = now.toISOString().slice(0, 10);
    const generatedDateLabel = formatDate(now.toISOString()) || dateStamp;
    const customLabel = typeof opts.customLabel === 'string' && opts.customLabel.trim() ? opts.customLabel.trim() : '';
    const categoryLabel = customLabel || labels[categoryFilter];
    const slug = customLabel ? 'selected' : slugs[categoryFilter];

    const rows = filtered.map((entry, idx) => ({
      index: idx + 1,
      expression: String(entry.expression || '').trim(),
      category: entry.category,
      categoryLabel: CATEGORIES[entry.category] || 'Vocabulary',
      meaning: String(entry.meaning || '').trim(),
      example: String(entry.example || '').trim(),
      masteryLabel: MASTERY_LABELS[getMasteryLevel(entry)] || 'New',
    }));

    return {
      title: 'IPMAT/CUET VOCAB BUILDER',
      subtitle: `Printable Study Sheet | ${categoryLabel} | ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`,
      categoryFilter,
      categoryLabel,
      filename: `ipmat-cuet-study-sheet-${slug}-${dateStamp}.pdf`,
      generatedDateLabel,
      totalCount: rows.length,
      rows,
    };
  }

  function buildPdfStudySheetBytes(entries, options) {
    const plan = buildPdfStudySheetPlan(entries, options);
    if (plan.rows.length === 0) {
      throw new Error(`No entries available in ${plan.categoryLabel} to export.`);
    }

    const pageW = 595;
    const pageH = 842;
    const marginX = 36;
    const contentW = pageW - marginX * 2;
    const showCatCol = plan.categoryFilter === 'all';

    // Column geometry & max character widths (9pt Helvetica inside A4)
    const cols = showCatCol
      ? [
          { label: '#', x: marginX, w: 26, maxChars: 4, font: 'F1' },
          { label: 'Word / Expression', x: marginX + 26, w: 102, maxChars: 18, font: 'F2' },
          { label: 'Category', x: marginX + 128, w: 66, maxChars: 11, font: 'F1' },
          { label: 'Meaning', x: marginX + 194, w: 138, maxChars: 26, font: 'F1' },
          { label: 'Example Sentence', x: marginX + 332, w: 141, maxChars: 27, font: 'F1' },
          { label: 'Level', x: marginX + 473, w: 50, maxChars: 9, font: 'F1' },
        ]
      : [
          { label: '#', x: marginX, w: 26, maxChars: 4, font: 'F1' },
          { label: 'Word / Expression', x: marginX + 26, w: 116, maxChars: 21, font: 'F2' },
          { label: 'Meaning', x: marginX + 142, w: 162, maxChars: 31, font: 'F1' },
          { label: 'Example Sentence', x: marginX + 304, w: 167, maxChars: 32, font: 'F1' },
          { label: 'Level', x: marginX + 471, w: 52, maxChars: 9, font: 'F1' },
        ];

    const pagesStreams = [];
    let cmds = [];
    let cursorY = 0;

    function drawBanner(isFirstPage) {
      if (isFirstPage) {
        cmds.push('0 0.161 0.384 rg'); // #002962
        cmds.push(`0 ${pageH - 78} ${pageW} 78 re f`);
        cmds.push('1 1 1 rg');
        cmds.push(`BT /F2 15 Tf ${marginX} ${pageH - 34} Td (${escapePdfString(plan.title)}) Tj ET`);
        cmds.push('0.859 0.918 0.996 rg');
        cmds.push(`BT /F1 9.5 Tf ${marginX} ${pageH - 54} Td (${escapePdfString(plan.subtitle)}) Tj ET`);
        cmds.push(`BT /F1 8.5 Tf ${pageW - marginX - 110} ${pageH - 54} Td (${escapePdfString('Generated ' + plan.generatedDateLabel)}) Tj ET`);
        cursorY = pageH - 96;
      } else {
        cmds.push('0 0.161 0.384 rg');
        cmds.push(`0 ${pageH - 34} ${pageW} 34 re f`);
        cmds.push('1 1 1 rg');
        cmds.push(`BT /F2 10 Tf ${marginX} ${pageH - 22} Td (${escapePdfString(plan.title + ' - Study Sheet')}) Tj ET`);
        cursorY = pageH - 48;
      }
    }

    function drawTableHeader() {
      const headerH = 22;
      cmds.push('0.933 0.953 0.976 rg'); // #EEF3F9
      cmds.push(`${marginX} ${cursorY - headerH} ${contentW} ${headerH} re f`);
      cmds.push('0.773 0.831 0.910 RG 0.7 w');
      cmds.push(`${marginX} ${cursorY - headerH} ${contentW} ${headerH} re S`);
      cmds.push('0 0.161 0.384 rg');
      for (const col of cols) {
        cmds.push(`BT /F2 8.5 Tf ${col.x + 5} ${cursorY - 14.5} Td (${escapePdfString(col.label)}) Tj ET`);
      }
      cursorY -= headerH;
    }

    function startPage(isFirstPage) {
      cmds = [];
      drawBanner(isFirstPage);
      drawTableHeader();
    }

    startPage(true);

    const lineHeight = 11.5;
    const minBottomY = 48;

    plan.rows.forEach((row, rowIdx) => {
      const cellTexts = showCatCol
        ? [String(row.index), row.expression, row.categoryLabel, row.meaning, row.example, row.masteryLabel]
        : [String(row.index), row.expression, row.meaning, row.example, row.masteryLabel];

      const wrappedCols = cols.map((col, ci) => wrapPdfText(cellTexts[ci], col.maxChars));
      const maxLines = Math.max(...wrappedCols.map((lines) => lines.length));
      const rowH = Math.max(22, maxLines * lineHeight + 10);

      if (cursorY - rowH < minBottomY) {
        pagesStreams.push(cmds.join('\n'));
        startPage(false);
      }

      if (rowIdx % 2 === 1) {
        cmds.push('0.961 0.953 0.941 rg'); // #F5F3F0
      } else {
        cmds.push('1 1 1 rg');
      }
      cmds.push(`${marginX} ${cursorY - rowH} ${contentW} ${rowH} re f`);
      cmds.push('0.886 0.878 0.851 RG 0.5 w');
      cmds.push(`${marginX} ${cursorY - rowH} ${contentW} ${rowH} re S`);

      cmds.push('0 0.161 0.384 rg');
      cols.forEach((col, ci) => {
        const lines = wrappedCols[ci];
        lines.forEach((line, li) => {
          const textY = cursorY - 13 - li * lineHeight;
          cmds.push(`BT /${col.font} 8.5 Tf ${col.x + 5} ${textY.toFixed(1)} Td (${escapePdfString(line)}) Tj ET`);
        });
      });

      cursorY -= rowH;
    });

    pagesStreams.push(cmds.join('\n'));

    const totalPages = pagesStreams.length;
    const finalizedStreams = pagesStreams.map((streamBody, idx) => {
      const footer = [
        '0.886 0.878 0.851 RG 0.6 w',
        `${marginX} 32 m ${pageW - marginX} 32 l S`,
        '0.231 0.333 0.471 rg',
        `BT /F1 8 Tf ${marginX} 19 Td (${escapePdfString(plan.title + ' | ' + plan.categoryLabel)}) Tj ET`,
        `BT /F1 8 Tf ${pageW - marginX - 52} 19 Td (${escapePdfString(`Page ${idx + 1} of ${totalPages}`)}) Tj ET`,
      ].join('\n');
      return streamBody + '\n' + footer;
    });

    // Assemble PDF objects:
    // 1: Catalog, 2: Pages, 3: Helvetica (/F1), 4: Helvetica-Bold (/F2),
    // 5..: alternating Page + Content Stream objects
    const objects = [];
    const pageObjIds = [];
    let nextId = 5;

    finalizedStreams.forEach(() => {
      pageObjIds.push(nextId);
      nextId += 2;
    });

    objects.push({
      id: 1,
      body: '<< /Type /Catalog /Pages 2 0 R >>',
    });
    objects.push({
      id: 2,
      body: `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`,
    });
    objects.push({
      id: 3,
      body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    });
    objects.push({
      id: 4,
      body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    });

    const encoder = new TextEncoder();
    finalizedStreams.forEach((streamStr, idx) => {
      const pageId = pageObjIds[idx];
      const streamId = pageId + 1;
      const streamLen = encoder.encode(streamStr).byteLength;
      objects.push({
        id: pageId,
        body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`,
      });
      objects.push({
        id: streamId,
        body: `<< /Length ${streamLen} >>\nstream\n${streamStr}\nendstream`,
      });
    });

    const chunks = [];
    let byteOffset = 0;
    const offsets = new Map();

    function pushChunk(str) {
      const bytes = encoder.encode(str);
      chunks.push(bytes);
      byteOffset += bytes.byteLength;
    }

    pushChunk('%PDF-1.4\n');
    for (const obj of objects) {
      offsets.set(obj.id, byteOffset);
      pushChunk(`${obj.id} 0 obj\n${obj.body}\nendobj\n`);
    }

    const xrefStart = byteOffset;
    const maxObjId = objects[objects.length - 1].id;
    pushChunk(`xref\n0 ${maxObjId + 1}\n0000000000 65535 f \n`);
    for (let id = 1; id <= maxObjId; id++) {
      const off = String(offsets.get(id) || 0).padStart(10, '0');
      pushChunk(`${off} 00000 n \n`);
    }
    pushChunk(`trailer\n<< /Size ${maxObjId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

    const totalBytes = chunks.reduce((sum, arr) => sum + arr.byteLength, 0);
    const out = new Uint8Array(totalBytes);
    let pos = 0;
    for (const arr of chunks) {
      out.set(arr, pos);
      pos += arr.byteLength;
    }

    return {
      bytes: out,
      filename: plan.filename,
      entryCount: plan.rows.length,
      categoryLabel: plan.categoryLabel,
    };
  }

  function getMissCount(entry) {
    if (!entry) return 0;
    return typeof entry.missCount === 'number' && Number.isFinite(entry.missCount) && entry.missCount > 0
      ? Math.floor(entry.missCount)
      : 0;
  }

  function isNeedsPractice(entry) {
    return getMissCount(entry) > 0;
  }

  function recordEntryMissPatch(entry, now) {
    const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
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

  function getUniqueSources(entries) {
    const counts = new Map();
    for (const entry of entries || []) {
      const title = String(entry && entry.sourceTitle ? entry.sourceTitle : '').trim();
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

  function computeExamCountdown(config, entries, now) {
    if (!config || !config.examDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(config.examDate).trim())) {
      return null;
    }
    const examName = String(config.examName || 'CUET').trim() || 'CUET';
    const parts = String(config.examDate).trim().split('-').map(Number);
    const targetMidnight = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    if (Number.isNaN(targetMidnight.getTime())) return null;

    const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
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
    const stats = getMasteryStats(entries || []);
    const remainingQueue = Math.max(0, stats.total - stats.masteredCount);

    const status = daysRemaining > 0 ? 'upcoming' : daysRemaining === 0 ? 'today' : 'past';
    const dailyPaceNeeded =
      remainingQueue === 0
        ? 0
        : daysRemaining > 0
          ? Math.ceil(remainingQueue / daysRemaining)
          : remainingQueue;

    let summaryText;
    if (status === 'today') {
      summaryText =
        remainingQueue > 0
          ? `${examName} is today · Final quick revision of ${remainingQueue} ${remainingQueue === 1 ? 'word' : 'words'}`
          : `${examName} is today · All ${stats.total} saved words mastered!`;
    } else if (status === 'past') {
      const daysAgo = Math.abs(daysRemaining);
      summaryText = `${examName} date passed ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago · Update your next exam date`;
    } else if (remainingQueue === 0) {
      summaryText = `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} to ${examName} · All ${stats.total} saved words mastered!`;
    } else {
      summaryText = `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} to ${examName} · Master ${dailyPaceNeeded} ${
        dailyPaceNeeded === 1 ? 'word' : 'words'
      }/day to finish your ${remainingQueue}-word queue`;
    }

    return {
      examName,
      examDate: String(config.examDate).trim(),
      daysRemaining,
      remainingQueue,
      masteredCount: stats.masteredCount,
      totalEntries: stats.total,
      dailyPaceNeeded,
      status,
      summaryText,
    };
  }

  function buildTemplateCsv(category, entries, includeEntries) {
    const headerFirst =
      category === 'idioms'
        ? 'Idiom'
        : category === 'phrasalVerbs'
          ? 'Phrasal Verb'
          : 'Word';
    const lines = [[headerFirst, 'Meaning', 'Example Sentence'].map(escapeCsvCell).join(',')];
    if (includeEntries && Array.isArray(entries)) {
      const subset = entries.filter((e) => e.category === category);
      for (const entry of subset) {
        lines.push(
          [entry.expression || '', entry.meaning || '', entry.example || '']
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }
    return lines.join('\r\n');
  }

  function isValidAppsScriptUrl(url) {
    return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec(?:\?.*)?$/i.test(
      String(url || '').trim()
    );
  }

  function validateAppsScriptUrlInput(rawUrl) {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) {
      return { ok: false, error: 'Paste your Apps Script Web App URL (ending in /exec) first.' };
    }
    if (/\/edit\b/i.test(trimmed) || /script\.google\.com\/(?:u\/\d+\/)?home\/projects\//i.test(trimmed)) {
      return {
        ok: false,
        error: 'That looks like the Apps Script editor (/edit) URL. Click Deploy -> New deployment -> Web app and copy the URL ending in /exec.',
      };
    }
    if (!isValidAppsScriptUrl(trimmed)) {
      return {
        ok: false,
        error: 'Invalid URL. It must start with https://script.google.com/macros/s/... and end with /exec.',
      };
    }
    return { ok: true, url: trimmed };
  }

  const APPS_SCRIPT_TEMPLATE = `function readAllCuetRows(ss) {
  var tabMap = [
    { category: 'vocabulary', name: 'Words' },
    { category: 'idioms', name: 'Idioms' },
    { category: 'phrasalVerbs', name: 'Phrasal Verbs' }
  ];
  var rows = [];
  for (var c = 0; c < tabMap.length; c++) {
    var cfg = tabMap[c];
    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) continue;
    var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < values.length; i++) {
      var expr = String(values[i][0] || '').trim();
      var meaning = String(values[i][1] || '').trim();
      var example = String(values[i][2] || '').trim();
      if (expr && meaning) {
        rows.push({
          category: cfg.category,
          expression: expr,
          meaning: meaning,
          example: example
        });
      }
    }
  }
  return rows;
}

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : '';
  if (action === 'pull') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, rows: readAllCuetRows(ss) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, supportsPull: true, status: 'IPMAT/CUET Vocab Sheet webhook is active.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateCuetTab(ss, category) {
  var tabMap = {
    vocabulary: { name: 'Words', header: 'Word' },
    idioms: { name: 'Idioms', header: 'Idiom' },
    phrasalVerbs: { name: 'Phrasal Verbs', header: 'Phrasal Verb' }
  };
  var cfg = tabMap[category] || tabMap.vocabulary;
  var sheet = ss.getSheetByName(cfg.name);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([cfg.header, 'Meaning', 'Example Sentence']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return { sheet: sheet, name: cfg.name };
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === 'pullAll') {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, rows: readAllCuetRows(ss) }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'syncBatch' && Array.isArray(data.rows)) {
      var grouped = { vocabulary: [], idioms: [], phrasalVerbs: [] };
      for (var i = 0; i < data.rows.length; i++) {
        var r = data.rows[i] || {};
        var cat = grouped[r.category] ? r.category : 'vocabulary';
        var expr = String(r.expression || '').trim();
        if (expr) {
          grouped[cat].push([expr, String(r.meaning || '').trim(), String(r.example || '').trim()]);
        }
      }
      var addedCount = 0;
      var skippedCount = 0;
      var cats = ['vocabulary', 'idioms', 'phrasalVerbs'];
      for (var c = 0; c < cats.length; c++) {
        var items = grouped[cats[c]];
        if (!items.length) continue;
        var target = getOrCreateCuetTab(ss, cats[c]).sheet;
        var lastRow = target.getLastRow();
        var existing = {};
        if (lastRow > 1) {
          var colA = target.getRange(2, 1, lastRow - 1, 1).getValues();
          for (var k = 0; k < colA.length; k++) {
            var key = String(colA[k][0] || '').trim().toLowerCase();
            if (key) existing[key] = true;
          }
        }
        var toInsert = [];
        for (var j = 0; j < items.length; j++) {
          var norm = items[j][0].toLowerCase();
          if (existing[norm]) {
            skippedCount++;
          } else {
            existing[norm] = true;
            toInsert.push(items[j]);
          }
        }
        if (toInsert.length) {
          target.getRange(lastRow + 1, 1, toInsert.length, 3).setValues(toInsert);
          addedCount += toInsert.length;
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, addedCount: addedCount, skippedCount: skippedCount }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var res = getOrCreateCuetTab(ss, data.category);
    if (!data.testOnly) {
      res.sheet.appendRow([
        String(data.expression || '').trim(),
        String(data.meaning || '').trim(),
        String(data.example || '').trim()
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, tabName: res.name }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return {
    CATEGORIES,
    CATEGORY_SINGULAR,
    SHEET_TABS,
    VALID_CATEGORIES,
    VALID_MASTERY_LEVELS,
    MASTERY_LABELS,
    MASTERY_BADGES,
    QUIZ_MIN_QUESTIONS,
    QUIZ_MAX_QUESTIONS,
    DEFAULT_DAILY_GOAL,
    MIN_DAILY_GOAL,
    MAX_DAILY_GOAL,
    GEMINI_MODEL,
    GEMINI_MODELS,
    DEFAULT_SETTINGS,
    APPS_SCRIPT_TEMPLATE,
    normalizeExpression,
    normalizeKey,
    detectCategory,
    parseBulkInput,
    extractContextSentence,
    findDuplicate,
    getCategoryCounts,
    getMasteryLevel,
    getMasteryStats,
    getMasteryBadgeProgress,
    getCategoryInsightData,
    getMasteryDistributionData,
    getStudyMasteryForOutcome,
    getReviewIntervalDays,
    createInitialReviewSchedule,
    previewReviewIntervals,
    calculateReviewPatch,
    getEntryReviewSchedule,
    getDailyReviewQueue,
    buildStudyDeck,
    getQuizEligibleEntries,
    generateQuizQuestions,
    getLocalDateKey,
    clampDailyGoal,
    computeDailyGoalStats,
    getMissCount,
    isNeedsPractice,
    recordEntryMissPatch,
    getUniqueSources,
    computeExamCountdown,
    formatEntryCopyText,
    getToolbarBadgeText,
    buildGeminiPrompt,
    parseGeminiResponse,
    sanitizeEntry,
    buildExportJson,
    validateAndMergeImport,
    escapeCsvCell,
    buildCsv,
    buildTemplateCsv,
    isValidAppsScriptUrl,
    validateAppsScriptUrlInput,
    buildAnkiTsv,
    mergePulledSheetEntries,
    getHighlightableEntries,
    escapeRegExp,
    buildHighlightMatcher,
    buildPdfStudySheetPlan,
    buildPdfStudySheetBytes,
    formatDate,
    generateId,
  };
});
