import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import JSZip from 'jszip';
import {
  BRAVE_APPS_SCRIPT_CODE,
  formatEntrySheetRow,
  getTabNameForCategory,
  isValidAppsScriptUrl,
  validateAppsScriptUrlInput,
} from './googleSheets.ts';
import {
  buildTemplateCsv,
  buildXlsxWorkbookParts,
  generateTemplateXlsxBlob,
} from './sheetTemplate.ts';
import {
  MASTERY_BADGES,
  buildAnkiTsv,
  buildCsv as buildWebCsv,
  buildExportJson,
  buildHighlightMatcher,
  buildStudyDeck,
  calculateReviewPatch,
  computeDailyGoalStats,
  computeExamCountdown,
  filterAndSortEntries,
  formatEntryCopyText,
  generateQuizQuestions,
  getCategoryInsightData,
  getDailyReviewQueue,
  getHighlightableEntries,
  getMasteryBadgeProgress,
  getMasteryDistributionData,
  getMasteryLevel,
  getMasteryStats,
  getMissCount,
  getQuizEligibleEntries,
  getStudyMasteryForOutcome,
  getUniqueSources,
  isNeedsPractice,
  mergePulledSheetEntries,
  recordEntryMissPatch,
  validateAndMergeImport,
  type VocabEntry,
} from './vocabLogic.ts';
import {
  buildPdfStudySheetPlan,
  generateStudySheetPdfBlob,
} from './pdfExport.ts';
import { SUPPORTED_BROWSERS } from './browserSupport.ts';

const require = createRequire(import.meta.url);
const shared = require(path.resolve('extension/shared.js'));

test('detectCategory classifies single words, phrasal verbs, and idioms accurately', () => {
  assert.equal(shared.detectCategory('ubiquitous'), 'vocabulary');
  assert.equal(shared.detectCategory('Meticulous.'), 'vocabulary');
  assert.equal(shared.detectCategory('well-known'), 'vocabulary');

  assert.equal(shared.detectCategory('come across'), 'phrasalVerbs');
  assert.equal(shared.detectCategory('put off'), 'phrasalVerbs');
  assert.equal(shared.detectCategory('look forward to'), 'phrasalVerbs');
  assert.equal(shared.detectCategory('run out of'), 'phrasalVerbs');
  assert.equal(shared.detectCategory('gave up'), 'phrasalVerbs');
  assert.equal(shared.detectCategory('get rid of'), 'phrasalVerbs');

  assert.equal(shared.detectCategory('Break the ice'), 'idioms');
  assert.equal(shared.detectCategory('A blessing in disguise'), 'idioms');
  assert.equal(shared.detectCategory('bite the bullet'), 'idioms');
  assert.equal(shared.detectCategory('under the weather'), 'idioms');
});

test('parseBulkInput handles commas, newlines, bullets, spaces, and duplicates', () => {
  const input = `
    1. aberration,   meticulous , pragmatic, ubiquitous
    - Break the ice
    • Come across
    Meticulous
    "A blessing in disguise"
  `;
  const parsed = shared.parseBulkInput(input);
  assert.deepEqual(parsed, [
    'aberration',
    'meticulous',
    'pragmatic',
    'ubiquitous',
    'Break the ice',
    'Come across',
    'A blessing in disguise',
  ]);
});

test('extractContextSentence isolates the sentence containing the selected expression', () => {
  const paragraph =
    'Modern essays often rely on concise arguments. Yet this ubiquitous habit of skimming makes deep reading harder! Readers should pause occasionally.';
  const ctx = shared.extractContextSentence(paragraph, 'ubiquitous');
  assert.equal(ctx, 'Yet this ubiquitous habit of skimming makes deep reading harder!');
});

test('parseGeminiResponse extracts strictly expression, meaning, and example only', () => {
  const raw = '```json\n{"expression":"pragmatic","meaning":"Dealing with problems in a practical and realistic way.","example":"She took a pragmatic approach to revising her CUET syllabus.","synonyms":["practical"],"extra":"ignore"}\n```';
  const result = shared.parseGeminiResponse(raw, 'pragmatic');
  assert.deepEqual(Object.keys(result).sort(), ['example', 'expression', 'meaning']);
  assert.equal(result.expression, 'pragmatic');
  assert.equal(result.meaning, 'Dealing with problems in a practical and realistic way.');
  assert.equal(result.example, 'She took a pragmatic approach to revising her CUET syllabus.');
});

test('buildExportJson strictly omits API keys and preserves valid entries', () => {
  const sampleEntry = {
    id: 'e1',
    expression: 'ephemeral',
    category: 'vocabulary',
    meaning: 'Lasting for only a very short time.',
    example: 'Fame on social media is often ephemeral.',
    contextSentence: 'Viral trends are ephemeral.',
    sourceTitle: 'Aeon',
    sourceUrl: 'https://aeon.co/essays/example',
    dateAdded: '2026-11-18T10:00:00.000Z',
    learned: false,
    favourite: true,
  };
  const backup = shared.buildExportJson([sampleEntry], {
    apiKey: 'AIza-SECRET-DO-NOT-EXPORT',
    model: 'gemini-3.1-flash-lite',
  });
  const serialized = JSON.stringify(backup);
  assert.equal(serialized.includes('AIza-SECRET-DO-NOT-EXPORT'), false);
  assert.equal(serialized.includes('apiKey'), false);
  assert.equal(backup.entries.length, 1);
  assert.equal(backup.counts.vocabulary, 1);
});

test('validateAndMergeImport safely merges without overwriting or deleting existing entries', () => {
  const existing = [
    {
      id: 'id-1',
      expression: 'meticulous',
      category: 'vocabulary',
      meaning: 'Original meaning kept intact.',
      example: 'Original example.',
      dateAdded: '2026-11-18T10:00:00.000Z',
      learned: true,
      favourite: false,
    },
  ];

  const incoming = {
    app: 'CUET Vocabulary Builder',
    entries: [
      {
        id: 'id-1',
        expression: 'Meticulous',
        category: 'vocabulary',
        meaning: 'Attempted overwrite.',
        example: 'Should be skipped.',
      },
      {
        id: 'id-2',
        expression: 'break the ice',
        category: 'idioms',
        meaning: 'To make people feel relaxed in a new situation.',
        example: 'A quick joke helped break the ice at the workshop.',
      },
    ],
  };

  const result = shared.validateAndMergeImport(existing, incoming);
  assert.equal(result.ok, true);
  assert.equal(result.addedCount, 1);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.mergedEntries.length, 2);
  assert.equal(result.mergedEntries[0].meaning, 'Original meaning kept intact.');
  assert.equal(result.mergedEntries[1].expression, 'break the ice');

  const badResult = shared.validateAndMergeImport(existing, { wrong: true });
  assert.equal(badResult.ok, false);
  assert.equal(badResult.mergedEntries.length, 1);
});

test('buildCsv outputs strictly Word, Meaning, Example Sentence with RFC 4180 escaping', () => {
  const sample = [
    {
      id: 'c1',
      expression: 'pragmatic',
      category: 'vocabulary' as const,
      meaning: 'Practical, realistic, and "down to earth".',
      example: 'A pragmatic plan saved time.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T00:00:00.000Z',
      learned: true,
      favourite: false,
    },
  ];
  const extCsv = shared.buildCsv(sample);
  const webCsv = buildWebCsv(sample);

  assert.equal(extCsv, webCsv);
  const lines = webCsv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[0], 'Word,Meaning,Example Sentence');
  assert.equal(lines[1], 'pragmatic,"Practical, realistic, and ""down to earth"".",A pragmatic plan saved time.');
  assert.equal(webCsv.includes('Category'), false);
  assert.equal(webCsv.includes('Date Added'), false);
  assert.equal(webCsv.includes('Learned'), false);
});

test('getMasteryLevel and getMasteryStats support explicit levels and legacy learned fallback in web and extension', () => {
  const entries: VocabEntry[] = [
    {
      id: 'm1',
      expression: 'ubiquitous',
      category: 'vocabulary',
      meaning: 'Present everywhere.',
      example: 'Smartphones are ubiquitous today.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-18T10:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
    {
      id: 'm2',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'To make people feel relaxed.',
      example: 'A warm smile helped break the ice.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: true,
      // legacy entry without masteryLevel
      favourite: true,
    },
    {
      id: 'm3',
      expression: 'come across',
      category: 'phrasalVerbs',
      meaning: 'To find by chance.',
      example: 'I came across an old journal.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-17T10:00:00.000Z',
      learned: false,
      favourite: false,
    },
  ];

  assert.equal(getMasteryLevel(entries[0]), 'learning');
  assert.equal(getMasteryLevel(entries[1]), 'mastered');
  assert.equal(getMasteryLevel(entries[2]), 'new');

  assert.equal(shared.getMasteryLevel(entries[0]), 'learning');
  assert.equal(shared.getMasteryLevel(entries[1]), 'mastered');
  assert.equal(shared.getMasteryLevel(entries[2]), 'new');

  const webStats = getMasteryStats(entries);
  const extStats = shared.getMasteryStats(entries);
  assert.deepEqual(webStats, extStats);
  assert.equal(webStats.total, 3);
  assert.equal(webStats.newCount, 1);
  assert.equal(webStats.learningCount, 1);
  assert.equal(webStats.masteredCount, 1);
  assert.equal(webStats.percentMastered, 33);
  assert.equal(webStats.percentLearning, 33);

  const emptyStats = getMasteryStats([]);
  assert.equal(emptyStats.total, 0);
  assert.equal(emptyStats.percentMastered, 0);
  assert.equal(emptyStats.percentLearning, 0);
});

test('filterAndSortEntries filters by word, meaning, example sentence, and mastery level', () => {
  const entries: VocabEntry[] = [
    {
      id: 'f1',
      expression: 'ubiquitous',
      category: 'vocabulary',
      meaning: 'Seeming to be everywhere at the same time.',
      example: 'Short videos have become ubiquitous on almost every news website.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-18T10:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
    {
      id: 'f2',
      expression: 'pragmatic',
      category: 'vocabulary',
      meaning: 'Dealing with things in a practical and realistic way.',
      example: 'She chose a pragmatic revision timetable before the exam.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: true,
      masteryLevel: 'mastered',
      favourite: true,
    },
    {
      id: 'f3',
      expression: 'ephemeral',
      category: 'vocabulary',
      meaning: 'Lasting for only a very short time.',
      example: 'Morning mist over the hills is ephemeral.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-17T10:00:00.000Z',
      learned: false,
      masteryLevel: 'new',
      favourite: false,
    },
  ];

  // Filter by word
  assert.deepEqual(
    filterAndSortEntries(entries, { category: 'vocabulary', query: 'UBIQ', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['f1']
  );

  // Filter by meaning
  assert.deepEqual(
    filterAndSortEntries(entries, { category: 'vocabulary', query: 'realistic', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['f2']
  );

  // Filter by example sentence
  assert.deepEqual(
    filterAndSortEntries(entries, { category: 'vocabulary', query: 'morning mist', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['f3']
  );

  // Filter by mastery level
  assert.deepEqual(
    filterAndSortEntries(entries, { category: 'vocabulary', query: '', masteryFilter: 'learning', sortOrder: 'recent' }).map((e) => e.id),
    ['f1']
  );
  assert.deepEqual(
    filterAndSortEntries(entries, { category: 'vocabulary', query: '', masteryFilter: 'mastered', sortOrder: 'recent' }).map((e) => e.id),
    ['f2']
  );
  assert.deepEqual(
    filterAndSortEntries(entries, { category: 'vocabulary', query: '', masteryFilter: 'new', sortOrder: 'recent' }).map((e) => e.id),
    ['f3']
  );
  assert.deepEqual(
    filterAndSortEntries(entries, { category: 'vocabulary', query: '', masteryFilter: 'favourites', sortOrder: 'recent' }).map((e) => e.id),
    ['f2']
  );

  // Cross-category ("all") + contextSentence + sourceTitle keyword matching
  const crossCat: VocabEntry[] = [
    ...entries,
    {
      id: 'f4',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'To make people feel relaxed in a new group.',
      example: 'A quick game helped break the ice.',
      contextSentence: 'We shared stories to break the ice at orientation.',
      sourceTitle: 'Campus Editorial Review',
      sourceUrl: '',
      dateAdded: '2026-11-20T10:00:00.000Z',
      learned: false,
      masteryLevel: 'new',
      favourite: false,
    },
    {
      id: 'f5',
      expression: 'put off',
      category: 'phrasalVerbs',
      meaning: 'To delay or postpone.',
      example: 'Do not put off revision.',
      contextSentence: 'Students often put off deep reading.',
      sourceTitle: 'Aeon Essay',
      sourceUrl: '',
      dateAdded: '2026-11-21T10:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
  ];

  // 'all' returns entries across all categories sorted newest first
  assert.deepEqual(
    filterAndSortEntries(crossCat, { category: 'all', query: '', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['f5', 'f4', 'f2', 'f1', 'f3']
  );

  // 'all' + keyword matches contextSentence & sourceTitle
  assert.deepEqual(
    filterAndSortEntries(crossCat, { category: 'all', query: 'orientation', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['f4']
  );
  assert.deepEqual(
    filterAndSortEntries(crossCat, { category: 'all', query: 'aeon', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['f5']
  );

  // Category filter narrows results even when keyword matches other categories
  assert.deepEqual(
    filterAndSortEntries(crossCat, { category: 'idioms', query: 'deep reading', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    []
  );
  assert.deepEqual(
    filterAndSortEntries(crossCat, { category: 'idioms', query: 'relaxed', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['f4']
  );
});

test('buildStudyDeck orders review-needed entries first, filters by scope, and maps study outcomes consistently in web and extension', () => {
  const entries: VocabEntry[] = [
    {
      id: 's-mastered',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'To make people feel relaxed.',
      example: 'A quick joke helped break the ice.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: true,
      masteryLevel: 'mastered',
      favourite: false,
    },
    {
      id: 's-learning',
      expression: 'ubiquitous',
      category: 'vocabulary',
      meaning: 'Present everywhere.',
      example: 'Smartphones are ubiquitous.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-18T10:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
    {
      id: 's-new',
      expression: 'come across',
      category: 'phrasalVerbs',
      meaning: 'To find by chance.',
      example: 'I came across a rare book.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-17T10:00:00.000Z',
      learned: false,
      masteryLevel: 'new',
      favourite: false,
    },
  ];

  const allWeb = buildStudyDeck(entries, 'all').map((e) => e.id);
  const allExt = shared.buildStudyDeck(entries, 'all').map((e: VocabEntry) => e.id);
  assert.deepEqual(allWeb, ['s-new', 's-learning', 's-mastered']);
  assert.deepEqual(allExt, allWeb);

  const reviewWeb = buildStudyDeck(entries, 'needsReview').map((e) => e.id);
  const reviewExt = shared.buildStudyDeck(entries, 'needsReview').map((e: VocabEntry) => e.id);
  assert.deepEqual(reviewWeb, ['s-new', 's-learning']);
  assert.deepEqual(reviewExt, reviewWeb);

  assert.deepEqual(
    buildStudyDeck(entries, 'idioms').map((e) => e.id),
    ['s-mastered']
  );

  assert.equal(getStudyMasteryForOutcome('known'), 'mastered');
  assert.equal(getStudyMasteryForOutcome('needsReview'), 'learning');
  assert.equal(shared.getStudyMasteryForOutcome('known'), 'mastered');
  assert.equal(shared.getStudyMasteryForOutcome('needsReview'), 'learning');
});

test('Quiz Mode generator enforces 5–20 range, filters to New/Learning, and supports random & custom selection', () => {
  const mk = (id: string, expr: string, meaning: string, masteryLevel: 'new' | 'learning' | 'mastered'): VocabEntry => ({
    id,
    expression: expr,
    category: 'vocabulary',
    meaning,
    example: `Example using ${expr}.`,
    contextSentence: '',
    sourceTitle: '',
    sourceUrl: '',
    dateAdded: '2026-11-18T10:00:00.000Z',
    learned: masteryLevel === 'mastered',
    masteryLevel,
    favourite: false,
  });

  const sample: VocabEntry[] = [
    mk('q1', 'ubiquitous', 'Present everywhere at once.', 'learning'),
    mk('q2', 'pragmatic', 'Practical and realistic in approach.', 'new'),
    mk('q3', 'meticulous', 'Careful about small details.', 'learning'),
    mk('q4', 'ephemeral', 'Lasting a very short time.', 'new'),
    mk('q5', 'aberration', 'A departure from what is normal.', 'new'),
    mk('q6', 'candid', 'Truthful and straightforward.', 'learning'),
    mk('q7', 'resilient', 'Able to recover quickly from difficulties.', 'mastered'),
  ];

  // Excludes mastered entries
  const eligibleWeb = getQuizEligibleEntries(sample);
  const eligibleExt = shared.getQuizEligibleEntries(sample);
  assert.equal(eligibleWeb.length, 6);
  assert.equal(eligibleExt.length, 6);
  assert.equal(eligibleWeb.some((e) => e.id === 'q7'), false);

  // Rejects when fewer than 5 eligible entries exist
  const tooFew = generateQuizQuestions(sample.slice(0, 4), { mode: 'random', count: 5 });
  assert.equal(tooFew.ok, false);

  // Random mode clamps count cleanly and produces 4 unique options per question
  const randWeb = generateQuizQuestions(sample, { mode: 'random', count: 5, rng: () => 0.42 });
  const randExt = shared.generateQuizQuestions(sample, { mode: 'random', count: 5, rng: () => 0.42 });
  assert.equal(randWeb.ok, true);
  assert.equal(randExt.ok, true);
  if (randWeb.ok) {
    assert.equal(randWeb.questions.length, 5);
    for (const q of randWeb.questions) {
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4);
      assert.equal(q.options[q.correctIndex], q.correctMeaning);
    }
  }

  // Custom mode enforces minimum 5 and builds exact chosen words
  const tooFewCustom = generateQuizQuestions(sample, { mode: 'custom', selectedIds: ['q1', 'q2', 'q3'] });
  assert.equal(tooFewCustom.ok, false);

  const customIds = ['q1', 'q2', 'q3', 'q4', 'q5'];
  const customRes = generateQuizQuestions(sample, { mode: 'custom', selectedIds: customIds, rng: () => 0.25 });
  assert.equal(customRes.ok, true);
  if (customRes.ok) {
    assert.deepEqual(customRes.questions.map((q) => q.entryId).sort(), customIds);
  }
});

test('computeDailyGoalStats accurately computes savedToday, goalReached, and multi-day streaks', () => {
  const now = new Date(2026, 10, 19, 14, 0, 0); // Local Nov 19, 2026
  const mkDay = (id: string, dayOffset: number): VocabEntry => {
    const d = new Date(2026, 10, 19 + dayOffset, 10, 0, 0);
    return {
      id,
      expression: `word-${id}`,
      category: 'vocabulary',
      meaning: `Meaning ${id}`,
      example: `Example ${id}`,
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: d.toISOString(),
      learned: false,
      masteryLevel: 'new',
      favourite: false,
    };
  };

  // 2 saved on Nov 17, 2 saved on Nov 18, 1 saved on Nov 19 -> with goal=2, streak is 2 (yesterday + day before)
  const midDayEntries = [
    mkDay('a', -2),
    mkDay('b', -2),
    mkDay('c', -1),
    mkDay('d', -1),
    mkDay('e', 0),
  ];
  const midWeb = computeDailyGoalStats(midDayEntries, 2, now);
  const midExt = shared.computeDailyGoalStats(midDayEntries, 2, now);
  assert.deepEqual(midWeb, midExt);
  assert.equal(midWeb.savedToday, 1);
  assert.equal(midWeb.goalReached, false);
  assert.equal(midWeb.progressPercent, 50);
  assert.equal(midWeb.streakDays, 2);

  // Adding one more word today completes today's goal -> streak becomes 3!
  const completedEntries = [...midDayEntries, mkDay('f', 0)];
  const doneWeb = computeDailyGoalStats(completedEntries, 2, now);
  assert.equal(doneWeb.savedToday, 2);
  assert.equal(doneWeb.goalReached, true);
  assert.equal(doneWeb.progressPercent, 100);
  assert.equal(doneWeb.streakDays, 3);
});

test('Google Sheets helpers map categories to 3 tabs and format 3-column rows strictly', () => {
  assert.equal(getTabNameForCategory('vocabulary'), 'Words');
  assert.equal(getTabNameForCategory('idioms'), 'Idioms');
  assert.equal(getTabNameForCategory('phrasalVerbs'), 'Phrasal Verbs');

  const row = formatEntrySheetRow({
    expression: '  pragmatic  ',
    meaning: ' Practical and realistic. ',
    example: ' She chose a pragmatic study plan. ',
  });
  assert.deepEqual(row, [
    'pragmatic',
    'Practical and realistic.',
    'She chose a pragmatic study plan.',
  ]);
  assert.equal(row.length, 3);
});

test('Brave extension manifest, icons, and files are complete and valid', () => {
  const extDir = path.resolve('extension');
  const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage', 'contextMenus']);
  assert.deepEqual(manifest.host_permissions, [
    'https://generativelanguage.googleapis.com/*',
    'https://script.google.com/*',
    'https://script.googleusercontent.com/*',
  ]);

  const requiredFiles = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    manifest.options_page,
    'dashboard.html',
    'dashboard.js',
    'dashboard.css',
    'popup.js',
    'popup.css',
    'settings.js',
    'settings.css',
    'shared.js',
    ...manifest.content_scripts[0].js,
    ...manifest.content_scripts[0].css,
    ...Object.values(manifest.icons),
  ];

  for (const rel of requiredFiles) {
    assert.ok(fs.existsSync(path.join(extDir, rel)), `Missing extension file: ${rel}`);
  }

  // Verify PNG signatures & exact IHDR dimensions
  for (const [sizeStr, relPath] of Object.entries(manifest.icons)) {
    const size = Number(sizeStr);
    const buf = fs.readFileSync(path.join(extDir, relPath as string));
    assert.deepEqual(Array.from(buf.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(buf.readUInt32BE(16), size);
    assert.equal(buf.readUInt32BE(20), size);
  }

  // Ensure Gemini 3.1 Flash Lite is the sole Gemini model in extension files
  assert.equal(shared.GEMINI_MODEL, 'gemini-3.1-flash-lite');
  assert.equal(shared.DEFAULT_SETTINGS.model, 'gemini-3.1-flash-lite');
  assert.deepEqual(shared.GEMINI_MODELS, [
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  ]);

  const disallowedModels = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'gemini-2.0-flash-thinking',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-3-flash-preview',
  ];
  for (const rel of fs.readdirSync(extDir)) {
    const full = path.join(extDir, rel);
    if (fs.statSync(full).isDirectory()) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const model of disallowedModels) {
      assert.equal(text.includes(model), false, `Disallowed model "${model}" found in ${rel}`);
    }
    assert.equal(/AIza[0-9A-Za-z_-]{30,}/.test(text), false, `Hardcoded API key found in ${rel}`);
  }
});

test('getCategoryInsightData, getMasteryDistributionData, formatEntryCopyText, and getToolbarBadgeText match across web and extension', () => {
  const entries: VocabEntry[] = [
    {
      id: 'i1',
      expression: 'pragmatic',
      category: 'vocabulary',
      meaning: 'Practical and realistic.',
      example: 'A pragmatic approach helped.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: new Date(2026, 10, 19, 9, 0, 0).toISOString(),
      learned: true,
      masteryLevel: 'mastered',
      favourite: false,
    },
    {
      id: 'i2',
      expression: 'ubiquitous',
      category: 'vocabulary',
      meaning: 'Present everywhere.',
      example: 'Smartphones are ubiquitous.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: new Date(2026, 10, 19, 10, 0, 0).toISOString(),
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
    {
      id: 'i3',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'Make people comfortable.',
      example: 'A joke helped break the ice.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: new Date(2026, 10, 18, 10, 0, 0).toISOString(),
      learned: true,
      masteryLevel: 'mastered',
      favourite: true,
    },
    {
      id: 'i4',
      expression: 'come across',
      category: 'phrasalVerbs',
      meaning: 'Find by chance.',
      example: 'I came across a helpful essay.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: new Date(2026, 10, 17, 10, 0, 0).toISOString(),
      learned: false,
      masteryLevel: 'new',
      favourite: false,
    },
  ];

  const webCat = getCategoryInsightData(entries);
  const extCat = shared.getCategoryInsightData(entries);
  assert.deepEqual(webCat, extCat);
  assert.equal(webCat.length, 3);
  assert.deepEqual(webCat[0], {
    category: 'vocabulary',
    label: 'Words',
    total: 2,
    mastered: 1,
    learning: 1,
    newCount: 0,
    percentMastered: 50,
  });
  assert.deepEqual(webCat[1], {
    category: 'idioms',
    label: 'Idioms',
    total: 1,
    mastered: 1,
    learning: 0,
    newCount: 0,
    percentMastered: 100,
  });
  assert.deepEqual(webCat[2], {
    category: 'phrasalVerbs',
    label: 'Phrasal Verbs',
    total: 1,
    mastered: 0,
    learning: 0,
    newCount: 1,
    percentMastered: 0,
  });

  const webDist = getMasteryDistributionData(entries);
  const extDist = shared.getMasteryDistributionData(entries);
  assert.deepEqual(webDist, extDist);
  assert.deepEqual(webDist, [
    { level: 'new', label: 'New', count: 1, percent: 25 },
    { level: 'learning', label: 'Learning', count: 1, percent: 25 },
    { level: 'mastered', label: 'Mastered', count: 2, percent: 50 },
  ]);

  const copyWeb = formatEntryCopyText(entries[0]);
  const copyExt = shared.formatEntryCopyText(entries[0]);
  assert.equal(copyWeb, copyExt);
  assert.equal(copyWeb, 'pragmatic — Practical and realistic. (Example: A pragmatic approach helped.)');

  const now = new Date(2026, 10, 19, 15, 0, 0);
  assert.deepEqual(shared.getToolbarBadgeText(entries, 5, now), { text: '2', isGoalReached: false });
  assert.deepEqual(shared.getToolbarBadgeText(entries, 2, now), { text: '✓', isGoalReached: true });
  assert.deepEqual(shared.getToolbarBadgeText([], 5, now), { text: '', isGoalReached: false });
});

test('buildTemplateCsv matches attached CSV schema strictly and optionally includes category entries', () => {
  const attachedCsv = fs.readFileSync(
    path.resolve('public/assets/aistudio/Copy_of_CUET_UG_2027_Vocabulary_-_Words_28a75673.csv'),
    'utf8'
  ).trim();

  assert.equal(buildTemplateCsv('vocabulary', [], false), attachedCsv);
  assert.equal(buildTemplateCsv('idioms', [], false), 'Idiom,Meaning,Example Sentence');
  assert.equal(buildTemplateCsv('phrasalVerbs', [], false), 'Phrasal Verb,Meaning,Example Sentence');

  const sample: VocabEntry[] = [
    {
      id: 't1',
      expression: 'pragmatic',
      category: 'vocabulary',
      meaning: 'Practical, realistic, and sensible.',
      example: 'A pragmatic plan saved time.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: false,
      favourite: false,
    },
    {
      id: 't2',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'To make people feel relaxed.',
      example: 'A warm joke helped break the ice.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T09:00:00.000Z',
      learned: false,
      favourite: false,
    },
  ];

  const populatedWordsCsv = buildTemplateCsv('vocabulary', sample, true);
  assert.deepEqual(populatedWordsCsv.split('\r\n'), [
    'Word,Meaning,Example Sentence',
    'pragmatic,"Practical, realistic, and sensible.",A pragmatic plan saved time.',
  ]);
});

test('buildXlsxWorkbookParts & generateTemplateXlsxBlob produce a valid 3-tab frozen OOXML .xlsx package', async () => {
  const entriesWithSpecialChars: VocabEntry[] = [
    {
      id: 'x1',
      expression: 'cut & dried',
      category: 'idioms',
      meaning: 'Clear <straightforward> & "settled" in advance.',
      example: "Don't assume the answer is cut & dried.",
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: false,
      favourite: false,
    },
  ];

  const parts = buildXlsxWorkbookParts({ entries: entriesWithSpecialChars, includeEntries: true });
  assert.ok(parts['[Content_Types].xml']);
  assert.ok(parts['_rels/.rels']);
  assert.ok(parts['xl/workbook.xml']);
  assert.ok(parts['xl/_rels/workbook.xml.rels']);
  assert.ok(parts['xl/styles.xml']);
  assert.ok(parts['xl/worksheets/sheet1.xml']);
  assert.ok(parts['xl/worksheets/sheet2.xml']);
  assert.ok(parts['xl/worksheets/sheet3.xml']);

  assert.match(parts['xl/workbook.xml'], /name="Words"/);
  assert.match(parts['xl/workbook.xml'], /name="Idioms"/);
  assert.match(parts['xl/workbook.xml'], /name="Phrasal Verbs"/);
  assert.match(parts['xl/worksheets/sheet1.xml'], /ySplit="1"[^>]*state="frozen"/);
  assert.match(parts['xl/worksheets/sheet1.xml'], />Word<\/t>/);
  assert.match(parts['xl/worksheets/sheet1.xml'], />Meaning<\/t>/);
  assert.match(parts['xl/worksheets/sheet1.xml'], />Example Sentence<\/t>/);
  assert.match(parts['xl/worksheets/sheet2.xml'], /cut &amp; dried/);
  assert.match(parts['xl/worksheets/sheet2.xml'], /&lt;straightforward&gt; &amp; &quot;settled&quot;/);
  assert.match(parts['xl/worksheets/sheet2.xml'], /Don&apos;t assume/);

  const blob = await generateTemplateXlsxBlob({ entries: entriesWithSpecialChars, includeEntries: true });
  const ab = await blob.arrayBuffer();
  const bytes = new Uint8Array(ab);
  assert.equal(bytes[0], 0x50); // 'P'
  assert.equal(bytes[1], 0x4b); // 'K'

  const reloaded = await JSZip.loadAsync(ab);
  assert.ok(reloaded.file('xl/workbook.xml'));
  assert.ok(reloaded.file('xl/worksheets/sheet3.xml'));
});

test('Apps Script validation accepts /exec deployments and rejects /edit URLs clearly', () => {
  const valid = 'https://script.google.com/macros/s/AKfycbz1234567890_abc-DEF/exec';
  assert.equal(isValidAppsScriptUrl(valid), true);
  assert.deepEqual(validateAppsScriptUrlInput(valid), { ok: true, url: valid });

  const editUrl = 'https://script.google.com/u/0/home/projects/16wwC-HVZ/edit';
  assert.equal(isValidAppsScriptUrl(editUrl), false);
  const editRes = validateAppsScriptUrlInput(editUrl);
  assert.equal(editRes.ok, false);
  if (!editRes.ok) {
    assert.match(editRes.error, /\/edit/);
    assert.match(editRes.error, /\/exec/);
  }

  assert.match(BRAVE_APPS_SCRIPT_CODE, /syncBatch/);
  assert.match(BRAVE_APPS_SCRIPT_CODE, /Example Sentence/);
});

test('buildPdfStudySheetPlan and generateStudySheetPdfBlob filter by category and produce valid PDF bytes', async () => {
  const sampleEntries: VocabEntry[] = [
    {
      id: 'p1',
      expression: 'ubiquitous',
      category: 'vocabulary',
      meaning: 'Present or seen everywhere.',
      example: 'Smartphones have become ubiquitous.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-18T10:00:00.000Z',
      learned: false,
      masteryLevel: 'new',
      favourite: false,
    },
    {
      id: 'p2',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'To make people feel relaxed.',
      example: 'A joke helped break the ice.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: true,
      masteryLevel: 'mastered',
      favourite: true,
    },
    {
      id: 'p3',
      expression: 'put off',
      category: 'phrasalVerbs',
      meaning: 'To delay or postpone.',
      example: 'Do not put off studying.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-20T10:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
  ];

  const allPlan = buildPdfStudySheetPlan(sampleEntries, {
    category: 'all',
    sortOrder: 'az',
    now: new Date('2026-11-19T12:00:00.000Z'),
  });
  assert.equal(allPlan.totalCount, 3);
  assert.equal(allPlan.filename, 'ipmat-cuet-study-sheet-all-categories-2026-11-19.pdf');
  assert.deepEqual(
    allPlan.rows.map((r) => r.expression),
    ['break the ice', 'put off', 'ubiquitous']
  );

  const idiomsPlan = buildPdfStudySheetPlan(sampleEntries, {
    category: 'idioms',
    sortOrder: 'az',
    now: new Date('2026-11-19T12:00:00.000Z'),
  });
  assert.equal(idiomsPlan.totalCount, 1);
  assert.equal(idiomsPlan.filename, 'ipmat-cuet-study-sheet-idioms-2026-11-19.pdf');
  assert.equal(idiomsPlan.rows[0].expression, 'break the ice');
  assert.equal(idiomsPlan.rows[0].masteryLabel, 'Mastered');

  const phrasalBlobRes = generateStudySheetPdfBlob(sampleEntries, {
    category: 'phrasalVerbs',
    sortOrder: 'recent',
    now: new Date('2026-11-19T12:00:00.000Z'),
  });
  assert.equal(phrasalBlobRes.entryCount, 1);
  assert.equal(phrasalBlobRes.filename, 'ipmat-cuet-study-sheet-phrasal-verbs-2026-11-19.pdf');
  const bytes = new Uint8Array(await phrasalBlobRes.blob.arrayBuffer());
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  assert.equal(header, '%PDF-');

  assert.throws(
    () => generateStudySheetPdfBlob([], { category: 'all' }),
    /No entries available/
  );
});

test('SUPPORTED_BROWSERS lists all Chromium-compatible desktop browsers and extension URLs', () => {
  const urls = SUPPORTED_BROWSERS.map((b) => `${b.name} (${b.extensionsUrl})`);
  assert.ok(urls.includes('Google Chrome (chrome://extensions)'));
  assert.ok(urls.includes('Microsoft Edge (edge://extensions)'));
  assert.ok(urls.includes('Vivaldi (vivaldi://extensions)'));
  assert.ok(urls.includes('Opera / Opera GX (opera://extensions)'));
  assert.ok(urls.includes('Arc (arc://extensions)'));
  assert.ok(urls.includes('Chromium / Ungoogled Chromium (chrome://extensions)'));
  assert.ok(urls.includes('Brave (brave://extensions)'));
});

test('buildAnkiTsv produces valid Anki-ready tab-separated cards across web and extension', () => {
  const entries: VocabEntry[] = [
    {
      id: 'a1',
      expression: 'pragmatic\tapproach',
      category: 'vocabulary',
      meaning: 'Practical <realistic> &\nsensible.',
      example: 'Take a pragmatic\tview.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: true,
    },
    {
      id: 'a2',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'To make people feel relaxed.',
      example: 'A warm joke helped break the ice.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T09:00:00.000Z',
      learned: true,
      masteryLevel: 'mastered',
      favourite: false,
    },
  ];

  const webTsv = buildAnkiTsv(entries);
  const extTsv = shared.buildAnkiTsv(entries);
  assert.equal(webTsv, extTsv);

  const lines = webTsv.split('\n');
  assert.equal(lines[0], '#separator:tab');
  assert.equal(lines[1], '#html:true');
  assert.equal(lines[2], '#tags column:3');
  assert.equal(lines.length, 5);

  const row1Cols = lines[3].split('\t');
  assert.equal(row1Cols.length, 3);
  assert.equal(row1Cols[0], 'pragmatic approach');
  assert.match(row1Cols[1], /&lt;realistic&gt; &amp; sensible\./);
  assert.match(row1Cols[1], /Take a pragmatic view\./);
  assert.equal(row1Cols[2], 'cuet ipmat vocabulary learning favourite');

  const row2Cols = lines[4].split('\t');
  assert.equal(row2Cols[0], 'break the ice');
  assert.equal(row2Cols[2], 'cuet ipmat idioms mastered');
});

test('mergePulledSheetEntries adds new rows and updates modified meanings while preserving local mastery', () => {
  const existing: VocabEntry[] = [
    {
      id: 'local-1',
      expression: 'ubiquitous',
      category: 'vocabulary',
      meaning: 'Old meaning',
      example: 'Old example.',
      contextSentence: '',
      sourceTitle: 'Local',
      sourceUrl: '',
      dateAdded: '2026-11-18T10:00:00.000Z',
      learned: true,
      masteryLevel: 'mastered',
      favourite: true,
    },
    {
      id: 'local-2',
      expression: 'put off',
      category: 'phrasalVerbs',
      meaning: 'To delay or postpone.',
      example: 'Do not put off revision.',
      contextSentence: '',
      sourceTitle: 'Local',
      sourceUrl: '',
      dateAdded: '2026-11-18T09:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
  ];

  const pulled = [
    { category: 'vocabulary' as const, expression: 'Word', meaning: 'Meaning', example: 'Example Sentence' },
    { category: 'vocabulary' as const, expression: 'Ubiquitous', meaning: 'Found everywhere.', example: 'Smartphones are ubiquitous.' },
    { category: 'phrasalVerbs' as const, expression: 'put off', meaning: 'To delay or postpone.', example: 'Do not put off revision.' },
    { category: 'idioms' as const, expression: 'bite the bullet', meaning: 'Face something difficult bravely.', example: 'He bit the bullet and started early.' },
    { category: 'vocabulary' as const, expression: '', meaning: 'Blank expression ignored', example: '' },
  ];

  const fixedNow = '2026-11-19T12:00:00.000Z';
  const webRes = mergePulledSheetEntries(existing, pulled, fixedNow);
  const extRes = shared.mergePulledSheetEntries(existing, pulled, fixedNow);

  assert.equal(webRes.addedCount, 1);
  assert.equal(webRes.updatedCount, 1);
  assert.equal(webRes.unchangedCount, 1);
  assert.equal(webRes.skippedCount, 2);
  assert.equal(extRes.addedCount, 1);
  assert.equal(extRes.updatedCount, 1);
  assert.equal(extRes.unchangedCount, 1);

  const updatedFirst = webRes.mergedEntries.find((e) => e.id === 'local-1')!;
  assert.equal(updatedFirst.meaning, 'Found everywhere.');
  assert.equal(updatedFirst.example, 'Smartphones are ubiquitous.');
  assert.equal(updatedFirst.masteryLevel, 'mastered');
  assert.equal(updatedFirst.favourite, true);

  const addedEntry = webRes.mergedEntries.find((e) => e.expression === 'bite the bullet')!;
  assert.equal(addedEntry.category, 'idioms');
  assert.equal(addedEntry.masteryLevel, 'new');
  assert.equal(addedEntry.dateAdded, fixedNow);
});

test('getHighlightableEntries & buildHighlightMatcher target only New/Learning terms longest-first', () => {
  const entries: VocabEntry[] = [
    {
      id: 'h1',
      expression: 'bullet',
      category: 'vocabulary',
      meaning: 'Small projectile.',
      example: 'Bullet train.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: false,
      masteryLevel: 'new',
      favourite: false,
    },
    {
      id: 'h2',
      expression: 'bite the bullet',
      category: 'idioms',
      meaning: 'Endure a tough task bravely.',
      example: 'Bite the bullet.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
    {
      id: 'h3',
      expression: 'ephemeral',
      category: 'vocabulary',
      meaning: 'Short-lived.',
      example: 'Ephemeral fame.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: true,
      masteryLevel: 'mastered',
      favourite: false,
    },
  ];

  const webHighlightable = getHighlightableEntries(entries);
  const extHighlightable = shared.getHighlightableEntries(entries);
  assert.equal(webHighlightable.length, 2);
  assert.equal(extHighlightable.length, 2);

  const webMatcher = buildHighlightMatcher(entries);
  const extMatcher = shared.buildHighlightMatcher(entries);
  assert.equal(webMatcher.count, 2);
  assert.equal(extMatcher.count, 2);
  assert.ok(webMatcher.regex);
  assert.ok(extMatcher.regex);

  const matches = 'Readers bite the bullet and ignore ephemeral trends.'.match(webMatcher.regex!);
  assert.deepEqual(matches, ['bite the bullet']);
});

test('extension shared.buildPdfStudySheetBytes builds a multi-page valid A4 PDF without external dependencies', () => {
  const manyEntries: VocabEntry[] = Array.from({ length: 35 }, (_, i) => ({
    id: `pdf-${i}`,
    expression: `expression-${i + 1}`,
    category: i % 2 === 0 ? 'vocabulary' : 'idioms',
    meaning: `Detailed exam-focused meaning number ${i + 1} designed to wrap cleanly inside an A4 column cell.`,
    example: `Students revised expression-${i + 1} thoroughly before the exam.`,
    contextSentence: '',
    sourceTitle: '',
    sourceUrl: '',
    dateAdded: new Date(2026, 10, 19, 10, i).toISOString(),
    learned: i % 3 === 0,
    masteryLevel: i % 3 === 0 ? 'mastered' : 'new',
    favourite: false,
  }));

  const pdfRes = shared.buildPdfStudySheetBytes(manyEntries, {
    category: 'all',
    sortOrder: 'az',
    now: new Date('2026-11-19T12:00:00.000Z'),
  });
  assert.equal(pdfRes.entryCount, 35);
  assert.equal(pdfRes.filename, 'ipmat-cuet-study-sheet-all-categories-2026-11-19.pdf');
  const decoded = new TextDecoder().decode(pdfRes.bytes);
  assert.ok(decoded.startsWith('%PDF-1.4'));
  assert.match(decoded, /xref\n0 /);
  assert.match(decoded, /Page 2 of /);
  assert.ok(decoded.trimEnd().endsWith('%%EOF'));
});

test('extension manifest & Apps Script include contextMenus, Alt+Shift+V shortcut, and Pull endpoints', () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve('extension/manifest.json'), 'utf8'));
  assert.ok(Array.isArray(manifest.permissions) && manifest.permissions.includes('contextMenus'));
  assert.equal(manifest.commands?.['save-selected-vocab']?.suggested_key?.default, 'Alt+Shift+V');

  assert.match(BRAVE_APPS_SCRIPT_CODE, /pullAll/);
  assert.match(BRAVE_APPS_SCRIPT_CODE, /function doGet/);
  assert.match(BRAVE_APPS_SCRIPT_CODE, /readAllCuetRows/);

  const settingsJs = fs.readFileSync(path.resolve('extension/settings.js'), 'utf8');
  assert.match(settingsJs, /APPS_SCRIPT_TEMPLATE/);
  assert.match(settingsJs, /inPageHighlighter/);
  assert.match(shared.APPS_SCRIPT_TEMPLATE, /pullAll/);
});

test('getMasteryBadgeProgress unlocks Novice, Vocabulary Scholar, and Master Learner across web and extension', () => {
  const makeEntries = (masteredCount: number, newCount = 2): VocabEntry[] => {
    const out: VocabEntry[] = [];
    for (let i = 0; i < masteredCount; i++) {
      out.push({
        id: `m-${i}`,
        expression: `word-${i}`,
        category: 'vocabulary',
        meaning: 'Meaning',
        example: 'Example',
        contextSentence: '',
        sourceTitle: '',
        sourceUrl: '',
        dateAdded: '2026-11-19T10:00:00.000Z',
        learned: true,
        masteryLevel: 'mastered',
        favourite: false,
      });
    }
    for (let j = 0; j < newCount; j++) {
      out.push({
        id: `n-${j}`,
        expression: `new-${j}`,
        category: 'vocabulary',
        meaning: 'Meaning',
        example: 'Example',
        contextSentence: '',
        sourceTitle: '',
        sourceUrl: '',
        dateAdded: '2026-11-19T10:00:00.000Z',
        learned: false,
        masteryLevel: 'new',
        favourite: false,
      });
    }
    return out;
  };

  assert.equal(MASTERY_BADGES.length, 5);
  assert.deepEqual(MASTERY_BADGES, shared.MASTERY_BADGES);

  const zero = getMasteryBadgeProgress(makeEntries(0));
  assert.deepEqual(zero, shared.getMasteryBadgeProgress(makeEntries(0)));
  assert.equal(zero.unlockedCount, 0);
  assert.equal(zero.currentBadge, null);
  assert.equal(zero.nextBadge?.title, 'Novice');
  assert.equal(zero.nextBadge?.remaining, 1);

  const one = getMasteryBadgeProgress(makeEntries(1));
  assert.deepEqual(one, shared.getMasteryBadgeProgress(makeEntries(1)));
  assert.equal(one.unlockedCount, 1);
  assert.equal(one.currentBadge?.title, 'Novice');
  assert.equal(one.nextBadge?.title, 'Word Collector');
  assert.equal(one.nextBadge?.remaining, 4);

  const fifteen = getMasteryBadgeProgress(makeEntries(15));
  assert.equal(fifteen.unlockedCount, 3);
  assert.equal(fifteen.currentBadge?.title, 'Vocabulary Scholar');
  assert.equal(fifteen.nextBadge?.title, 'Lexicon Tactician');

  const fifty = getMasteryBadgeProgress(makeEntries(50));
  assert.deepEqual(fifty, shared.getMasteryBadgeProgress(makeEntries(50)));
  assert.equal(fifty.unlockedCount, 5);
  assert.equal(fifty.currentBadge?.title, 'Master Learner');
  assert.equal(fifty.nextBadge, null);
  assert.ok(fifty.badges.every((b) => b.unlocked && b.progressPercent === 100 && b.remaining === 0));
});

test('Library search filters entries in real-time by word, meaning, or source title across web and extension', () => {
  const sample: VocabEntry[] = [
    {
      id: 's1',
      expression: 'ubiquitous',
      category: 'vocabulary',
      meaning: 'Present or seen almost everywhere at the same time.',
      example: 'Smartphones are ubiquitous.',
      contextSentence: '',
      sourceTitle: 'The Attention Economy — Sample Essay',
      sourceUrl: 'https://aeon.co/essays/example',
      dateAdded: '2026-11-18T09:15:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
    {
      id: 's2',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'To make people feel relaxed in a new situation.',
      example: 'A quick game helped break the ice.',
      contextSentence: '',
      sourceTitle: 'The Art of Conversation',
      sourceUrl: 'https://medium.com/example',
      dateAdded: '2026-11-17T14:30:00.000Z',
      learned: true,
      masteryLevel: 'mastered',
      favourite: false,
    },
    {
      id: 's3',
      expression: 'put off',
      category: 'phrasalVerbs',
      meaning: 'To postpone or delay doing something.',
      example: 'Do not put off revision.',
      contextSentence: '',
      sourceTitle: 'The Quiet Craft of Slow Reading',
      sourceUrl: 'https://aeon.co/essays/slow-reading',
      dateAdded: '2026-11-16T15:00:00.000Z',
      learned: false,
      masteryLevel: 'new',
      favourite: false,
    },
  ];

  // Match by word/expression
  assert.deepEqual(
    filterAndSortEntries(sample, { category: 'all', query: 'UBIQ', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['s1']
  );

  // Match by meaning
  assert.deepEqual(
    filterAndSortEntries(sample, { category: 'all', query: 'postpone', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['s3']
  );

  // Match by source title
  assert.deepEqual(
    filterAndSortEntries(sample, { category: 'all', query: 'Art of Conversation', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['s2']
  );
  assert.deepEqual(
    filterAndSortEntries(sample, { category: 'all', query: 'Slow Reading', masteryFilter: 'all', sortOrder: 'recent' }).map((e) => e.id),
    ['s3']
  );

  // Extension dashboard parity checks
  const extDashHtml = fs.readFileSync(path.resolve('extension/dashboard.html'), 'utf8');
  const extDashJs = fs.readFileSync(path.resolve('extension/dashboard.js'), 'utf8');
  assert.match(extDashHtml, /Search by word, meaning, or source title/);
  assert.ok(extDashHtml.indexOf('id="search-input"') < extDashHtml.indexOf('id="entries-list"'));
  assert.match(extDashJs, /sourceTitle/);
});

test('computeExamCountdown computes daily revision pace, today, past, all-mastered, and invalid date states', () => {
  const now = new Date(2026, 3, 1, 10, 0, 0); // April 1, 2026
  // Build 250 unmastered + 10 mastered entries
  const entries: VocabEntry[] = Array.from({ length: 260 }, (_, idx) => ({
    id: `ex-${idx}`,
    expression: `term-${idx}`,
    category: 'vocabulary',
    meaning: `Meaning ${idx}`,
    example: `Example ${idx}`,
    contextSentence: '',
    sourceTitle: '',
    sourceUrl: '',
    dateAdded: now.toISOString(),
    learned: idx < 10,
    masteryLevel: idx < 10 ? 'mastered' : 'new',
    favourite: false,
  }));

  // 42 days ahead: May 13, 2026 -> ceil(250 / 42) = 6 words/day
  const upcoming = computeExamCountdown({ examName: 'CUET', examDate: '2026-05-13' }, entries, now);
  assert.ok(upcoming);
  assert.equal(upcoming.status, 'upcoming');
  assert.equal(upcoming.daysRemaining, 42);
  assert.equal(upcoming.remainingQueue, 250);
  assert.equal(upcoming.dailyPaceNeeded, 6);
  assert.equal(upcoming.summaryText, '42 days to CUET · Master 6 words/day to finish your 250-word queue');

  // Exam today
  const todayRes = computeExamCountdown({ examName: 'IPMAT', examDate: '2026-04-01' }, entries.slice(0, 12), now);
  assert.ok(todayRes);
  assert.equal(todayRes.status, 'today');
  assert.equal(todayRes.daysRemaining, 0);
  assert.equal(todayRes.remainingQueue, 2);
  assert.match(todayRes.summaryText, /IPMAT is today/);

  // Past exam date
  const pastRes = computeExamCountdown({ examName: 'CUET', examDate: '2026-03-29' }, entries.slice(0, 12), now);
  assert.ok(pastRes);
  assert.equal(pastRes.status, 'past');
  assert.equal(pastRes.daysRemaining, -3);
  assert.match(pastRes.summaryText, /passed 3 days ago/);

  // All mastered
  const allMastered = computeExamCountdown({ examName: 'CUET', examDate: '2026-05-13' }, entries.slice(0, 10), now);
  assert.ok(allMastered);
  assert.equal(allMastered.remainingQueue, 0);
  assert.equal(allMastered.dailyPaceNeeded, 0);
  assert.match(allMastered.summaryText, /All 10 saved words mastered/);

  // Invalid date / null config
  assert.equal(computeExamCountdown(null, entries, now), null);
  assert.equal(computeExamCountdown({ examName: 'CUET', examDate: 'not-a-date' }, entries, now), null);
});

test('SRS Due Today queue, interval progression, dueToday filter, and dailyReview study deck work deterministically', () => {
  const now = new Date('2026-11-20T12:00:00.000Z');
  const dayMs = 24 * 60 * 60 * 1000;

  const entries: VocabEntry[] = [
    {
      id: 'srs-overdue',
      expression: 'ephemeral',
      category: 'vocabulary',
      meaning: 'Short-lived.',
      example: 'Trends are ephemeral.',
      contextSentence: '',
      sourceTitle: 'Aeon',
      sourceUrl: '',
      dateAdded: new Date(now.getTime() - 5 * dayMs).toISOString(),
      learned: false,
      masteryLevel: 'new',
      favourite: false,
      nextReviewAt: new Date(now.getTime() - 2 * dayMs).toISOString(),
    },
    {
      id: 'srs-today',
      expression: 'pragmatic',
      category: 'vocabulary',
      meaning: 'Practical and realistic.',
      example: 'A pragmatic choice.',
      contextSentence: '',
      sourceTitle: 'The Hindu',
      sourceUrl: '',
      dateAdded: new Date(now.getTime() - 3 * dayMs).toISOString(),
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
      nextReviewAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'srs-future',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'Make people comfortable.',
      example: 'A joke broke the ice.',
      contextSentence: '',
      sourceTitle: 'Aeon',
      sourceUrl: '',
      dateAdded: new Date(now.getTime() - 1 * dayMs).toISOString(),
      learned: true,
      masteryLevel: 'mastered',
      favourite: false,
      nextReviewAt: new Date(now.getTime() + 7 * dayMs).toISOString(),
    },
  ];

  const queue = getDailyReviewQueue(entries, now);
  assert.equal(queue.totalDue, 2);
  assert.equal(queue.overdueCount, 1);
  assert.equal(queue.dueTodayCount, 1);
  assert.deepEqual(queue.dueEntries.map((e) => e.id), ['srs-overdue', 'srs-today']);

  // Study deck 'dailyReview' returns due entries in priority order
  assert.deepEqual(
    buildStudyDeck(entries, 'dailyReview', now).map((e) => e.id),
    ['srs-overdue', 'srs-today']
  );

  // Filter 'dueToday' returns only entries due today or overdue
  assert.deepEqual(
    filterAndSortEntries(entries, {
      category: 'all',
      query: '',
      masteryFilter: 'dueToday',
      sortOrder: 'recent',
      now,
    }).map((e) => e.id),
    ['srs-today', 'srs-overdue']
  );

  // Interval progression: new (1d) -> learning (3d) -> mastered (7d -> 14d -> 30d)
  const p1 = calculateReviewPatch({ reviewCount: 0 }, 'learning', { now });
  assert.equal(p1.reviewIntervalDays, 3);
  assert.equal(p1.reviewCount, 1);

  const p2 = calculateReviewPatch({ reviewCount: 0 }, 'mastered', { now });
  assert.equal(p2.reviewIntervalDays, 7);
  assert.equal(p2.reviewCount, 1);

  const p3 = calculateReviewPatch({ reviewCount: 1 }, 'mastered', { now });
  assert.equal(p3.reviewIntervalDays, 14);
  assert.equal(p3.reviewCount, 2);

  const p4 = calculateReviewPatch({ reviewCount: 2 }, 'mastered', { now });
  assert.equal(p4.reviewIntervalDays, 30);
  assert.equal(p4.reviewCount, 3);
});

test('Mistake Tracker records misses, filters Needs Practice, sorts Most Missed, and round-trips through JSON backup', () => {
  const now = new Date('2026-11-20T12:00:00.000Z');
  const base: VocabEntry = {
    id: 'm-1',
    expression: 'aberration',
    category: 'vocabulary',
    meaning: 'A departure from what is normal.',
    example: 'The storm was an aberration.',
    contextSentence: '',
    sourceTitle: 'The Economist',
    sourceUrl: '',
    dateAdded: '2026-11-18T10:00:00.000Z',
    learned: true,
    masteryLevel: 'mastered',
    favourite: false,
  };

  assert.equal(getMissCount(base), 0);
  assert.equal(isNeedsPractice(base), false);

  const patch1 = recordEntryMissPatch(base, now);
  assert.equal(patch1.missCount, 1);
  assert.equal(patch1.masteryLevel, 'learning');
  assert.equal(patch1.learned, false);
  assert.equal(patch1.lastMissedAt, now.toISOString());
  assert.equal(patch1.reviewIntervalDays, 1);

  const missedOnce: VocabEntry = { ...base, ...patch1 };
  const patch2 = recordEntryMissPatch(missedOnce, now);
  const missedTwice: VocabEntry = { ...missedOnce, ...patch2 };
  assert.equal(getMissCount(missedTwice), 2);
  assert.equal(isNeedsPractice(missedTwice), true);

  const secondEntry: VocabEntry = {
    id: 'm-2',
    expression: 'candid',
    category: 'vocabulary',
    meaning: 'Truthful and direct.',
    example: 'A candid review.',
    contextSentence: '',
    sourceTitle: 'Aeon',
    sourceUrl: '',
    dateAdded: '2026-11-19T10:00:00.000Z',
    learned: false,
    masteryLevel: 'learning',
    favourite: false,
    missCount: 1,
  };
  const thirdEntry: VocabEntry = {
    id: 'm-3',
    expression: 'resilient',
    category: 'vocabulary',
    meaning: 'Able to recover quickly.',
    example: 'Resilient learners succeed.',
    contextSentence: '',
    sourceTitle: 'Aeon',
    sourceUrl: '',
    dateAdded: '2026-11-20T09:00:00.000Z',
    learned: false,
    masteryLevel: 'new',
    favourite: false,
  };

  const all = [thirdEntry, secondEntry, missedTwice];
  assert.deepEqual(
    filterAndSortEntries(all, {
      category: 'all',
      query: '',
      masteryFilter: 'needsPractice',
      sortOrder: 'mostMissed',
    }).map((e) => e.id),
    ['m-1', 'm-2']
  );

  // Export & re-import preserves missCount and lastMissedAt
  const exported = buildExportJson([missedTwice]);
  const reimported = validateAndMergeImport([], exported);
  assert.equal(reimported.ok, true);
  assert.equal(reimported.mergedEntries.length, 1);
  assert.equal(reimported.mergedEntries[0].missCount, 2);
  assert.equal(reimported.mergedEntries[0].lastMissedAt, now.toISOString());
});

test('getUniqueSources groups reading sources by count and filterAndSortEntries filters by sourceFilter', () => {
  const entries: VocabEntry[] = [
    {
      id: 'src-1',
      expression: 'ubiquitous',
      category: 'vocabulary',
      meaning: 'Present everywhere.',
      example: 'Example 1.',
      contextSentence: '',
      sourceTitle: 'Aeon',
      sourceUrl: '',
      dateAdded: '2026-11-18T10:00:00.000Z',
      learned: false,
      favourite: false,
    },
    {
      id: 'src-2',
      expression: 'pragmatic',
      category: 'vocabulary',
      meaning: 'Practical.',
      example: 'Example 2.',
      contextSentence: '',
      sourceTitle: 'The Hindu',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: false,
      favourite: false,
    },
    {
      id: 'src-3',
      expression: 'put off',
      category: 'phrasalVerbs',
      meaning: 'Delay.',
      example: 'Example 3.',
      contextSentence: '',
      sourceTitle: 'Aeon',
      sourceUrl: '',
      dateAdded: '2026-11-20T10:00:00.000Z',
      learned: false,
      favourite: false,
    },
    {
      id: 'src-4',
      expression: 'candid',
      category: 'vocabulary',
      meaning: 'Honest.',
      example: 'Example 4.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-20T11:00:00.000Z',
      learned: false,
      favourite: false,
    },
  ];

  const sources = getUniqueSources(entries);
  assert.deepEqual(sources, [
    { title: 'Aeon', count: 2 },
    { title: 'The Hindu', count: 1 },
  ]);

  assert.deepEqual(
    filterAndSortEntries(entries, {
      category: 'all',
      query: '',
      masteryFilter: 'all',
      sortOrder: 'recent',
      sourceFilter: 'Aeon',
    }).map((e) => e.id),
    ['src-3', 'src-1']
  );
});

test('buildPdfStudySheetPlan supports customLabel for bulk-selected subsets', () => {
  const subset: VocabEntry[] = [
    {
      id: 'b1',
      expression: 'meticulous',
      category: 'vocabulary',
      meaning: 'Very careful about details.',
      example: 'She kept meticulous notes.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
    {
      id: 'b2',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'To make people feel relaxed.',
      example: 'A warm greeting broke the ice.',
      contextSentence: '',
      sourceTitle: '',
      sourceUrl: '',
      dateAdded: '2026-11-19T11:00:00.000Z',
      learned: true,
      masteryLevel: 'mastered',
      favourite: false,
    },
  ];

  const plan = buildPdfStudySheetPlan(subset, {
    category: 'all',
    sortOrder: 'az',
    customLabel: 'Selected Subset (2 entries)',
    now: new Date('2026-11-20T12:00:00.000Z'),
  });

  assert.equal(plan.categoryLabel, 'Selected Subset (2 entries)');
  assert.equal(plan.filename, 'ipmat-cuet-study-sheet-selected-2026-11-20.pdf');
  assert.equal(plan.totalCount, 2);
  assert.match(plan.subtitle, /Selected Subset \(2 entries\)/);
});

test('extension shared.js mirrors website parity helpers (Exam Countdown, Mistake Tracker, Sources, Sheets CSV/URL, Selected PDF)', () => {
  const now = new Date('2026-11-20T12:00:00.000Z');
  const entries: VocabEntry[] = [
    {
      id: 'ext-1',
      expression: 'aberration',
      category: 'vocabulary',
      meaning: 'A departure from what is normal.',
      example: 'The cold spell was an aberration.',
      contextSentence: '',
      sourceTitle: 'Aeon',
      sourceUrl: '',
      dateAdded: '2026-11-18T10:00:00.000Z',
      learned: false,
      masteryLevel: 'new',
      favourite: false,
    },
    {
      id: 'ext-2',
      expression: 'put off',
      category: 'phrasalVerbs',
      meaning: 'To delay or postpone.',
      example: 'Never put off daily revision.',
      contextSentence: '',
      sourceTitle: 'The Hindu',
      sourceUrl: '',
      dateAdded: '2026-11-19T10:00:00.000Z',
      learned: false,
      masteryLevel: 'learning',
      favourite: false,
    },
    {
      id: 'ext-3',
      expression: 'break the ice',
      category: 'idioms',
      meaning: 'To make people feel relaxed.',
      example: 'A warm greeting broke the ice.',
      contextSentence: '',
      sourceTitle: 'Aeon',
      sourceUrl: '',
      dateAdded: '2026-11-19T11:00:00.000Z',
      learned: true,
      masteryLevel: 'mastered',
      favourite: true,
    },
  ];

  // Exam Countdown parity
  const examConfig = { examName: 'CUET UG', examDate: '2026-12-01' };
  const webCountdown = computeExamCountdown(examConfig, entries, now);
  const extCountdown = shared.computeExamCountdown(examConfig, entries, now);
  assert.ok(extCountdown);
  assert.deepEqual(extCountdown, webCountdown);
  if (extCountdown) {
    assert.equal(extCountdown.daysRemaining, 11);
    assert.equal(extCountdown.remainingQueue, 2);
  }

  // Mistake Tracker + sanitizeEntry round-trip
  const missPatch = shared.recordEntryMissPatch(entries[0], now);
  assert.equal(missPatch.missCount, 1);
  assert.equal(missPatch.masteryLevel, 'learning');
  assert.equal(missPatch.reviewIntervalDays, 1);

  const missed = { ...entries[0], ...missPatch };
  assert.equal(shared.getMissCount(missed), 1);
  assert.equal(shared.isNeedsPractice(missed), true);

  const sanitized = shared.sanitizeEntry(missed);
  assert.equal(sanitized.missCount, 1);
  assert.equal(sanitized.lastMissedAt, now.toISOString());

  // Unique sources parity
  assert.deepEqual(shared.getUniqueSources(entries), getUniqueSources(entries));

  // Google Sheets CSV & Apps Script validation parity
  assert.equal(shared.buildTemplateCsv('vocabulary', [], false), buildTemplateCsv('vocabulary', [], false));
  assert.equal(shared.buildTemplateCsv('idioms', [], false), buildTemplateCsv('idioms', [], false));
  assert.equal(shared.buildTemplateCsv('phrasalVerbs', [], false), buildTemplateCsv('phrasalVerbs', [], false));
  assert.equal(shared.isValidAppsScriptUrl('https://script.google.com/macros/s/AKfycbz123/exec'), true);
  assert.equal(shared.validateAppsScriptUrlInput('https://script.google.com/u/0/edit').ok, false);
  assert.match(shared.APPS_SCRIPT_TEMPLATE, /syncBatch/);
  assert.match(shared.APPS_SCRIPT_TEMPLATE, /pullAll/);

  // Selected subset PDF plan parity
  const extPdfPlan = shared.buildPdfStudySheetPlan(entries.slice(0, 2), {
    category: 'all',
    sortOrder: 'az',
    customLabel: 'Selected Subset (2 entries)',
    now,
  });
  assert.equal(extPdfPlan.filename, 'ipmat-cuet-study-sheet-selected-2026-11-20.pdf');
  assert.equal(extPdfPlan.totalCount, 2);
});

test('extension UI files use Add to Vocab Vault branding, Nesoi dark mode, and built-in Google Sheets guide', () => {
  const extDir = path.resolve('extension');
  const contentJs = fs.readFileSync(path.join(extDir, 'content.js'), 'utf8');
  const backgroundJs = fs.readFileSync(path.join(extDir, 'background.js'), 'utf8');
  const dashboardHtml = fs.readFileSync(path.join(extDir, 'dashboard.html'), 'utf8');
  const dashboardCss = fs.readFileSync(path.join(extDir, 'dashboard.css'), 'utf8');
  const popupHtml = fs.readFileSync(path.join(extDir, 'popup.html'), 'utf8');
  const settingsHtml = fs.readFileSync(path.join(extDir, 'settings.html'), 'utf8');

  assert.equal(contentJs.includes('Add to Vocab Vault'), true);
  assert.equal(contentJs.includes('Save to CUET List'), false);
  assert.equal(backgroundJs.includes("title: 'Add to Vocab Vault'"), true);
  assert.equal(popupHtml.includes('Add to Vocab Vault'), true);
  assert.equal(settingsHtml.includes('Add to Vocab Vault'), true);

  // Google Sheets guide & dark mode toggle present inside THE VOCAB VAULT dashboard
  assert.equal(dashboardHtml.includes('id="sheets-guide-panel"'), true);
  assert.equal(dashboardHtml.includes('id="btn-theme-toggle"'), true);
  assert.equal(dashboardHtml.includes('id="exam-card"'), true);
  assert.equal(dashboardHtml.includes('id="bulk-bar"'), true);
  assert.equal(dashboardHtml.includes('id="btn-toast-undo"'), true);
  assert.equal(dashboardCss.includes('html.dark'), true);
});



