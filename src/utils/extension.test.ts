import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  buildCreateSpreadsheetPayload,
  formatEntrySheetRow,
  getTabNameForCategory,
  parseSpreadsheetId,
} from './googleSheets.ts';

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
    model: 'gemini-2.5-flash',
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

test('buildCsv escapes commas and quotes per RFC 4180', () => {
  const csv = shared.buildCsv([
    {
      expression: 'pragmatic',
      category: 'vocabulary',
      meaning: 'Practical, realistic, and "down to earth".',
      example: 'A pragmatic plan saved time.',
      dateAdded: '2026-11-19T00:00:00.000Z',
      learned: true,
      favourite: false,
    },
  ]);
  assert.ok(csv.startsWith('Expression,Category,Meaning,Example,Date Added,Learned,Favourite\r\n'));
  assert.ok(csv.includes('"Practical, realistic, and ""down to earth""."'));
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

  assert.equal(
    parseSpreadsheetId('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(
    parseSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(parseSpreadsheetId('not-a-valid-sheet'), null);
  assert.equal(parseSpreadsheetId(''), null);

  const payload = buildCreateSpreadsheetPayload('My CUET Words');
  assert.equal(payload.properties.title, 'My CUET Words');
  assert.deepEqual(
    payload.sheets.map((s) => s.properties.title),
    ['Words', 'Idioms', 'Phrasal Verbs']
  );
  assert.equal(payload.sheets[0].properties.gridProperties.frozenRowCount, 1);
  assert.deepEqual(
    payload.sheets[0].data[0].rowData[0].values.map((v) => v.userEnteredValue.stringValue),
    ['Word', 'Meaning', 'Example Sentence']
  );
  assert.deepEqual(
    payload.sheets[1].data[0].rowData[0].values.map((v) => v.userEnteredValue.stringValue),
    ['Idiom', 'Meaning', 'Example Sentence']
  );
  assert.deepEqual(
    payload.sheets[2].data[0].rowData[0].values.map((v) => v.userEnteredValue.stringValue),
    ['Phrasal Verb', 'Meaning', 'Example Sentence']
  );
});

test('Brave extension manifest, icons, and files are complete and valid', () => {
  const extDir = path.resolve('extension');
  const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
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

  // Ensure zero deprecated Gemini models or hardcoded API keys exist in extension files
  const deprecatedModels = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'gemini-2.0-flash-thinking',
  ];
  for (const rel of fs.readdirSync(extDir)) {
    const full = path.join(extDir, rel);
    if (fs.statSync(full).isDirectory()) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const model of deprecatedModels) {
      assert.equal(text.includes(model), false, `Deprecated model "${model}" found in ${rel}`);
    }
    assert.equal(/AIza[0-9A-Za-z_-]{30,}/.test(text), false, `Hardcoded API key found in ${rel}`);
  }
});
