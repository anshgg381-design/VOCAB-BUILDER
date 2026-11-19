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

  const GEMINI_MODELS = [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended — Fast & Accurate)' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (Fastest & Lightweight)' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Highest Nuance)' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
  ];

  const SHEET_TABS = {
    vocabulary: 'Words',
    idioms: 'Idioms',
    phrasalVerbs: 'Phrasal Verbs',
  };

  const DEFAULT_SETTINGS = {
    apiKey: '',
    model: 'gemini-2.5-flash',
    customModel: '',
    sheetWebhookUrl: '',
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
      learned: Boolean(raw.learned),
      favourite: Boolean(raw.favourite),
    };
  }

  function buildExportJson(entries, settings) {
    const safeEntries = Array.isArray(entries)
      ? entries.map((e) => sanitizeEntry(e)).filter(Boolean)
      : [];

    // NEVER include apiKey in exported backups
    const safeModel =
      settings && typeof settings.model === 'string' && settings.model
        ? settings.model
        : DEFAULT_SETTINGS.model;

    return {
      app: 'CUET Vocabulary Builder',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      counts: getCategoryCounts(safeEntries),
      preferences: {
        model: safeModel,
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
    const headers = [
      'Expression',
      'Category',
      'Meaning',
      'Example',
      'Date Added',
      'Learned',
      'Favourite',
    ];
    const lines = [headers.map(escapeCsvCell).join(',')];

    for (const entry of entries || []) {
      const row = [
        entry.expression || '',
        CATEGORIES[entry.category] || entry.category || '',
        entry.meaning || '',
        entry.example || '',
        formatDate(entry.dateAdded),
        entry.learned ? 'Yes' : 'No',
        entry.favourite ? 'Yes' : 'No',
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }

    return lines.join('\r\n');
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

  return {
    CATEGORIES,
    CATEGORY_SINGULAR,
    SHEET_TABS,
    VALID_CATEGORIES,
    GEMINI_MODELS,
    DEFAULT_SETTINGS,
    normalizeExpression,
    normalizeKey,
    detectCategory,
    parseBulkInput,
    extractContextSentence,
    findDuplicate,
    getCategoryCounts,
    buildGeminiPrompt,
    parseGeminiResponse,
    sanitizeEntry,
    buildExportJson,
    validateAndMergeImport,
    escapeCsvCell,
    buildCsv,
    formatDate,
    generateId,
  };
});
