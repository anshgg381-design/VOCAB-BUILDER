import JSZip from 'jszip';
import { REQUIRED_SHEET_TABS } from './googleSheets';
import { Category, VocabEntry } from './vocabLogic';

export const STARTER_XLSX_FILENAME = 'CUET_UG_2027_Vocabulary_Template.xlsx';

export const STARTER_CSV_FILENAMES: Record<Category, string> = {
  vocabulary: 'CUET_UG_2027_Vocabulary_-_Words.csv',
  idioms: 'CUET_UG_2027_Vocabulary_-_Idioms.csv',
  phrasalVerbs: 'CUET_UG_2027_Vocabulary_-_Phrasal_Verbs.csv',
};

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function getTemplateHeadersForCategory(category: Category): [string, string, string] {
  const found = REQUIRED_SHEET_TABS.find((t) => t.category === category);
  return found ? found.headers : ['Word', 'Meaning', 'Example Sentence'];
}

/**
 * Generates a starter CSV matching the 3-column Google Sheet tab schema:
 * - Words: Word,Meaning,Example Sentence
 * - Idioms: Idiom,Meaning,Example Sentence
 * - Phrasal Verbs: Phrasal Verb,Meaning,Example Sentence
 */
export function buildTemplateCsv(
  category: Category = 'vocabulary',
  entries: VocabEntry[] = [],
  includeEntries = false
): string {
  const headers = getTemplateHeadersForCategory(category);
  const lines = [headers.map(escapeCsvCell).join(',')];

  if (includeEntries && entries.length > 0) {
    const filtered = [...entries]
      .filter((e) => e.category === category)
      .reverse();
    for (const entry of filtered) {
      lines.push(
        [entry.expression.trim(), entry.meaning.trim(), entry.example.trim()]
          .map(escapeCsvCell)
          .join(',')
      );
    }
  }

  return lines.join('\r\n');
}

export function escapeXml(value: string): string {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function columnIndexToLetter(index: number): string {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result || 'A';
}

export function buildWorksheetXml(
  headers: [string, string, string],
  rows: Array<[string, string, string]>,
  isFirstSheet = false
): string {
  const renderCell = (colIdx: number, rowNum: number, val: string, styleId: number) => {
    const ref = `${columnIndexToLetter(colIdx)}${rowNum}`;
    return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(val)}</t></is></c>`;
  };

  const headerCells = headers.map((h, i) => renderCell(i, 1, h, 1)).join('');
  const rowXmls: string[] = [
    `<row r="1" ht="24" customHeight="1">${headerCells}</row>`,
  ];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const cells = row.map((cell, colIdx) => renderCell(colIdx, rowNum, cell, 2)).join('');
    rowXmls.push(`<row r="${rowNum}">${cells}</row>`);
  });

  const lastRow = Math.max(1, rows.length + 1);
  const tabSelectedAttr = isFirstSheet ? 'tabSelected="1" ' : '';

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<dimension ref="A1:C${lastRow}"/>`,
    '<sheetViews>',
    `<sheetView ${tabSelectedAttr}workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView>`,
    '</sheetViews>',
    '<sheetFormatPr defaultRowHeight="20"/>',
    '<cols>',
    '<col min="1" max="1" width="26" customWidth="1"/>',
    '<col min="2" max="2" width="52" customWidth="1"/>',
    '<col min="3" max="3" width="64" customWidth="1"/>',
    '</cols>',
    `<sheetData>${rowXmls.join('')}</sheetData>`,
    '</worksheet>',
  ].join('');
}

export function buildXlsxWorkbookParts(options?: {
  entries?: VocabEntry[];
  includeEntries?: boolean;
}): Record<string, string> {
  const entries = options?.entries || [];
  const includeEntries = Boolean(options?.includeEntries);

  const contentTypesXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    ...REQUIRED_SHEET_TABS.map(
      (_, idx) =>
        `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    ),
    '</Types>',
  ].join('');

  const rootRelsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
    '</Relationships>',
  ].join('');

  const workbookXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheets>',
    ...REQUIRED_SHEET_TABS.map(
      (tab, idx) =>
        `<sheet name="${escapeXml(tab.title)}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`
    ),
    '</sheets>',
    '</workbook>',
  ].join('');

  const workbookRelsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ...REQUIRED_SHEET_TABS.map(
      (_, idx) =>
        `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`
    ),
    `<Relationship Id="rId${REQUIRED_SHEET_TABS.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    '</Relationships>',
  ].join('');

  const stylesXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<fonts count="2">',
    '<font><sz val="11"/><color rgb="FF0A1628"/><name val="Arial"/></font>',
    '<font><b/><sz val="11"/><color rgb="FF081C33"/><name val="Arial"/></font>',
    '</fonts>',
    '<fills count="3">',
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE6EEF8"/></patternFill></fill>',
    '</fills>',
    '<borders count="2">',
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border><left/><right/><top/><bottom style="thin"><color rgb="FFCBD9EC"/></bottom><diagonal/></border>',
    '</borders>',
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
    '<cellXfs count="3">',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>',
    '</cellXfs>',
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
    '</styleSheet>',
  ].join('');

  const parts: Record<string, string> = {
    '[Content_Types].xml': contentTypesXml,
    '_rels/.rels': rootRelsXml,
    'xl/workbook.xml': workbookXml,
    'xl/_rels/workbook.xml.rels': workbookRelsXml,
    'xl/styles.xml': stylesXml,
  };

  REQUIRED_SHEET_TABS.forEach((tab, idx) => {
    const rows: Array<[string, string, string]> = includeEntries
      ? [...entries]
          .filter((e) => e.category === tab.category)
          .reverse()
          .map((e) => [e.expression.trim(), e.meaning.trim(), e.example.trim()])
      : [];
    parts[`xl/worksheets/sheet${idx + 1}.xml`] = buildWorksheetXml(tab.headers, rows, idx === 0);
  });

  return parts;
}

export async function generateTemplateXlsxBlob(options?: {
  entries?: VocabEntry[];
  includeEntries?: boolean;
}): Promise<Blob> {
  const parts = buildXlsxWorkbookParts(options);
  const zip = new JSZip();
  for (const [filePath, xml] of Object.entries(parts)) {
    zip.file(filePath, xml);
  }
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadTemplateXlsx(options?: {
  entries?: VocabEntry[];
  includeEntries?: boolean;
}): Promise<string> {
  const blob = await generateTemplateXlsxBlob(options);
  triggerFileDownload(blob, STARTER_XLSX_FILENAME);
  return STARTER_XLSX_FILENAME;
}

export function downloadTemplateCsv(
  category: Category = 'vocabulary',
  entries: VocabEntry[] = [],
  includeEntries = false
): string {
  const csv = buildTemplateCsv(category, entries, includeEntries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const filename = STARTER_CSV_FILENAMES[category];
  triggerFileDownload(blob, filename);
  return filename;
}
