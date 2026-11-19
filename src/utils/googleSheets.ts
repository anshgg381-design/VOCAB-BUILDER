import { Category, VocabEntry, normalizeKey } from './vocabLogic';

export const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

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

export interface ConnectedSheet {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export interface SheetInspection {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  existingTabs: string[];
  missingTabs: Array<{ category: Category; title: string; headers: [string, string, string] }>;
}

export class SheetAuthExpiredError extends Error {
  constructor(message = 'Your Google Sheets session expired. Please sign in with Google again.') {
    super(message);
    this.name = 'SheetAuthExpiredError';
  }
}

export function getTabNameForCategory(category: Category): string {
  return SHEET_TABS[category] || 'Words';
}

export function formatEntrySheetRow(entry: Pick<VocabEntry, 'expression' | 'meaning' | 'example'>): [string, string, string] {
  return [entry.expression.trim(), entry.meaning.trim(), entry.example.trim()];
}

export function parseSpreadsheetId(rawInput: string): string | null {
  if (typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,})/);
  if (urlMatch) return urlMatch[1];

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function buildCreateSpreadsheetPayload(title = 'CUET UG 2027 Vocabulary') {
  return {
    properties: { title },
    sheets: REQUIRED_SHEET_TABS.map((tab, index) => ({
      properties: {
        sheetId: index + 1,
        title: tab.title,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
      data: [
        {
          startRow: 0,
          startColumn: 0,
          rowData: [
            {
              values: tab.headers.map((header) => ({
                userEnteredValue: { stringValue: header },
                userEnteredFormat: {
                  textFormat: { bold: true },
                },
              })),
            },
          ],
        },
      ],
    })),
  };
}

function escapeSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

async function sheetsFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    throw new SheetAuthExpiredError();
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const apiMsg = data?.error?.message || `Google Sheets request failed (HTTP ${res.status}).`;
    if (res.status === 403) {
      throw new Error(
        'Permission denied for this Google Sheet. Make sure you own or have edit access to the spreadsheet.'
      );
    }
    if (res.status === 404) {
      throw new Error('Google Sheet not found. Double-check the spreadsheet link or ID.');
    }
    throw new Error(apiMsg);
  }

  return data as T;
}

export async function createVocabularySpreadsheet(
  accessToken: string,
  title = 'CUET UG 2027 Vocabulary'
): Promise<ConnectedSheet> {
  const payload = buildCreateSpreadsheetPayload(title);
  const data = await sheetsFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties?: { title?: string };
  }>(SHEETS_API_BASE, accessToken, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties?.title || title,
  };
}

export async function inspectSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetInspection> {
  const fields = encodeURIComponent(
    'spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title'
  );
  const data = await sheetsFetch<{
    spreadsheetId: string;
    spreadsheetUrl?: string;
    properties?: { title?: string };
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(`${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}?fields=${fields}`, accessToken);

  const existingTabs = (data.sheets || [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));
  const existingSet = new Set(existingTabs.map((t) => t.trim().toLowerCase()));

  const missingTabs = REQUIRED_SHEET_TABS.filter(
    (req) => !existingSet.has(req.title.toLowerCase())
  );

  return {
    spreadsheetId: data.spreadsheetId || spreadsheetId,
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title: data.properties?.title || 'CUET Vocabulary Sheet',
    existingTabs,
    missingTabs,
  };
}

export async function ensureSpreadsheetTabsAndHeaders(
  accessToken: string,
  inspection: SheetInspection
): Promise<ConnectedSheet> {
  const { spreadsheetId, missingTabs } = inspection;

  if (missingTabs.length > 0) {
    await sheetsFetch(`${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: missingTabs.map((tab) => ({
          addSheet: {
            properties: {
              title: tab.title,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        })),
      }),
    });

    await sheetsFetch(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: missingTabs.map((tab) => ({
            range: `${escapeSheetTitle(tab.title)}!A1:C1`,
            values: [tab.headers],
          })),
        }),
      }
    );
  }

  // Ensure existing required tabs have headers if row 1 is empty
  for (const tab of REQUIRED_SHEET_TABS) {
    if (missingTabs.some((m) => m.title === tab.title)) continue;
    const range = encodeURIComponent(`${escapeSheetTitle(tab.title)}!A1:C1`);
    const existingRow = await sheetsFetch<{ values?: string[][] }>(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${range}`,
      accessToken
    );
    if (!existingRow.values || existingRow.values.length === 0 || existingRow.values[0].every((c) => !c.trim())) {
      await sheetsFetch(
        `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${range}?valueInputOption=USER_ENTERED`,
        accessToken,
        {
          method: 'PUT',
          body: JSON.stringify({ values: [tab.headers] }),
        }
      );
    }
  }

  return {
    spreadsheetId: inspection.spreadsheetId,
    spreadsheetUrl: inspection.spreadsheetUrl,
    title: inspection.title,
  };
}

export async function appendEntryToSheet(
  accessToken: string,
  spreadsheetId: string,
  entry: Pick<VocabEntry, 'expression' | 'category' | 'meaning' | 'example'>
): Promise<{ tabName: string }> {
  const tabName = getTabNameForCategory(entry.category);
  const range = encodeURIComponent(`${escapeSheetTitle(tabName)}!A:C`);
  const row = formatEntrySheetRow(entry);

  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  return { tabName };
}

export async function syncLibraryEntriesToSheet(
  accessToken: string,
  spreadsheetId: string,
  entries: VocabEntry[]
): Promise<{ addedCount: number; skippedCount: number }> {
  let addedCount = 0;
  let skippedCount = 0;

  for (const tab of REQUIRED_SHEET_TABS) {
    const categoryEntries = entries.filter((e) => e.category === tab.category);
    if (categoryEntries.length === 0) continue;

    const colARange = encodeURIComponent(`${escapeSheetTitle(tab.title)}!A:A`);
    const existingRes = await sheetsFetch<{ values?: string[][] }>(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${colARange}`,
      accessToken
    );
    const existingKeys = new Set(
      (existingRes.values || [])
        .map((row) => normalizeKey(row[0] || ''))
        .filter(Boolean)
    );

    const rowsToAppend: Array<[string, string, string]> = [];
    // Append oldest-first so spreadsheet reads chronologically
    for (const entry of [...categoryEntries].reverse()) {
      const key = normalizeKey(entry.expression);
      if (!key || existingKeys.has(key)) {
        skippedCount++;
        continue;
      }
      existingKeys.add(key);
      rowsToAppend.push(formatEntrySheetRow(entry));
    }

    if (rowsToAppend.length > 0) {
      const appendRange = encodeURIComponent(`${escapeSheetTitle(tab.title)}!A:C`);
      await sheetsFetch(
        `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ values: rowsToAppend }),
        }
      );
      addedCount += rowsToAppend.length;
    }
  }

  return { addedCount, skippedCount };
}

export const BRAVE_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tabMap = {
      vocabulary: { name: 'Words', header: 'Word' },
      idioms: { name: 'Idioms', header: 'Idiom' },
      phrasalVerbs: { name: 'Phrasal Verbs', header: 'Phrasal Verb' }
    };
    var cfg = tabMap[data.category] || tabMap.vocabulary;

    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([cfg.header, 'Meaning', 'Example Sentence']);
      sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    if (!data.testOnly) {
      sheet.appendRow([
        String(data.expression || '').trim(),
        String(data.meaning || '').trim(),
        String(data.example || '').trim()
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, tabName: cfg.name }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
