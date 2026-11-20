import { Category, PulledSheetRow, VocabEntry } from './vocabLogic';

export const SHEET_TABS: Record<Category, string> = {
  vocabulary: 'Words',
  idioms: 'Idioms',
  phrasalVerbs: 'Phrasal Verbs',
};

export const REQUIRED_SHEET_TABS: Array<{ category: Category; title: string; headers: [string, string, string] }> = [
  { category: 'vocabulary', title: 'Words', headers: ['Word', 'Meaning', 'Example Sentence'] },
  { category: 'idioms', title: 'Idioms', headers: ['Idiom', 'Meaning', 'Example Sentence'] },
  { category: 'phrasalVerbs', title: 'Phrasal Verbs', headers: ['Phrasal Verb', 'Meaning', 'Example Sentence'] },
];

export function getTabNameForCategory(category: Category): string {
  return SHEET_TABS[category] || 'Words';
}

export function formatEntrySheetRow(entry: Pick<VocabEntry, 'expression' | 'meaning' | 'example'>): [string, string, string] {
  return [entry.expression.trim(), entry.meaning.trim(), entry.example.trim()];
}

export const APPS_SCRIPT_URL_REGEX =
  /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec(?:[?#].*)?$/i;

export function isValidAppsScriptUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  return APPS_SCRIPT_URL_REGEX.test(rawUrl.trim());
}

export function validateAppsScriptUrlInput(rawUrl: string): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!trimmed) {
    return { ok: false, error: 'Paste your Google Apps Script Web App URL ending in /exec.' };
  }
  if (/script\.google\.com\/.*\/edit/i.test(trimmed)) {
    return {
      ok: false,
      error: 'That is the Apps Script editor (/edit) link. Click Deploy -> New deployment -> Web app and copy the URL ending in /exec.',
    };
  }
  if (!isValidAppsScriptUrl(trimmed)) {
    return {
      ok: false,
      error: 'Invalid URL. It must start with https://script.google.com/macros/s/ and end with /exec.',
    };
  }
  return { ok: true, url: trimmed };
}

async function postToAppsScript<T>(webhookUrl: string, body: Record<string, unknown>): Promise<T> {
  const validated = validateAppsScriptUrlInput(webhookUrl);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  let response: Response;
  try {
    response = await fetch(validated.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Could not reach your Apps Script URL. Verify "Who has access" is set to "Anyone" and try again.'
    );
  }

  if (!response.ok) {
    throw new Error(
      `Apps Script deployment returned HTTP ${response.status}. Confirm you deployed as Web app with "Who has access: Anyone".`
    );
  }

  const rawText = await response.text();
  let data: (T & { ok?: boolean; error?: string }) | null = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(
      'Apps Script returned a sign-in page instead of JSON. Re-deploy your Web app with "Execute as: Me" and "Who has access: Anyone".'
    );
  }

  if (!data || data.ok === false) {
    throw new Error(data?.error || 'Apps Script rejected the request.');
  }

  return data;
}

export async function appendEntryViaAppsScript(
  webhookUrl: string,
  payload: {
    category: Category;
    expression: string;
    meaning: string;
    example: string;
    testOnly?: boolean;
  }
): Promise<{ tabName: string }> {
  const data = await postToAppsScript<{ ok: boolean; tabName?: string }>(webhookUrl, {
    category: payload.category,
    expression: payload.expression,
    meaning: payload.meaning,
    example: payload.example,
    testOnly: Boolean(payload.testOnly),
  });

  return { tabName: data.tabName || getTabNameForCategory(payload.category) };
}

export async function syncLibraryViaAppsScript(
  webhookUrl: string,
  entries: VocabEntry[]
): Promise<{ addedCount: number; skippedCount: number }> {
  if (entries.length === 0) {
    return { addedCount: 0, skippedCount: 0 };
  }

  const rows = [...entries].reverse().map((e) => ({
    category: e.category,
    expression: e.expression.trim(),
    meaning: e.meaning.trim(),
    example: e.example.trim(),
  }));

  const data = await postToAppsScript<{
    ok: boolean;
    addedCount?: number;
    skippedCount?: number;
  }>(webhookUrl, {
    action: 'syncBatch',
    rows,
  });

  return {
    addedCount: typeof data.addedCount === 'number' ? data.addedCount : rows.length,
    skippedCount: typeof data.skippedCount === 'number' ? data.skippedCount : 0,
  };
}

export async function pullLibraryViaAppsScript(webhookUrl: string): Promise<PulledSheetRow[]> {
  const data = await postToAppsScript<{
    ok: boolean;
    rows?: Array<{
      category?: Category;
      expression?: string;
      meaning?: string;
      example?: string;
    }>;
  }>(webhookUrl, {
    action: 'pullAll',
  });

  if (!Array.isArray(data.rows)) {
    throw new Error(
      'Your deployed Apps Script is an older version without Pull support. Copy the updated script from Sheet Template & Setup and deploy a new Web app version.'
    );
  }

  return data.rows
    .map((r) => ({
      category: r?.category,
      expression: String(r?.expression || '').trim(),
      meaning: String(r?.meaning || '').trim(),
      example: String(r?.example || '').trim(),
    }))
    .filter((r) => Boolean(r.expression && r.meaning));
}

export const BRAVE_APPS_SCRIPT_CODE = `function readAllCuetRows(ss) {
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
    .createTextOutput(JSON.stringify({ ok: true, supportsPull: true, status: 'CUET Vocabulary Sheet webhook is active.' }))
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
