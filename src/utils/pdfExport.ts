import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CATEGORIES,
  Category,
  MASTERY_LABELS,
  VocabEntry,
  filterAndSortEntries,
  formatDate,
  getMasteryLevel,
} from './vocabLogic';

export type PdfCategoryFilter = 'all' | Category;
export type PdfSortOrder = 'az' | 'za' | 'recent';

export interface PdfStudySheetRow {
  index: number;
  expression: string;
  category: Category;
  categoryLabel: string;
  meaning: string;
  example: string;
  masteryLabel: string;
}

export interface PdfStudySheetPlan {
  title: string;
  subtitle: string;
  categoryFilter: PdfCategoryFilter;
  categoryLabel: string;
  filename: string;
  generatedDateLabel: string;
  totalCount: number;
  rows: PdfStudySheetRow[];
}

const PDF_CATEGORY_LABELS: Record<PdfCategoryFilter, string> = {
  all: 'All Categories (Words, Idioms & Phrasal Verbs)',
  vocabulary: 'Vocabulary (Words)',
  idioms: 'Idioms',
  phrasalVerbs: 'Phrasal Verbs',
};

const PDF_FILENAME_SLUGS: Record<PdfCategoryFilter, string> = {
  all: 'all-categories',
  vocabulary: 'words',
  idioms: 'idioms',
  phrasalVerbs: 'phrasal-verbs',
};

export function getPdfCategoryLabel(filter: PdfCategoryFilter): string {
  return PDF_CATEGORY_LABELS[filter];
}

export function buildPdfStudySheetPlan(
  entries: VocabEntry[],
  options: {
    category?: PdfCategoryFilter;
    sortOrder?: PdfSortOrder;
    customLabel?: string;
    now?: Date;
  } = {}
): PdfStudySheetPlan {
  const categoryFilter: PdfCategoryFilter = options.category ?? 'all';
  const sortOrder: PdfSortOrder = options.sortOrder ?? 'az';
  const now = options.now ?? new Date();

  const filtered = filterAndSortEntries(entries, {
    category: categoryFilter,
    query: '',
    masteryFilter: 'all',
    sortOrder,
  });

  const dateStamp = now.toISOString().slice(0, 10);
  const generatedDateLabel = formatDate(now.toISOString()) || dateStamp;
  const categoryLabel = options.customLabel?.trim() || getPdfCategoryLabel(categoryFilter);
  const slug = options.customLabel ? 'selected' : PDF_FILENAME_SLUGS[categoryFilter];

  const rows: PdfStudySheetRow[] = filtered.map((entry, idx) => ({
    index: idx + 1,
    expression: entry.expression.trim(),
    category: entry.category,
    categoryLabel: CATEGORIES[entry.category],
    meaning: entry.meaning.trim(),
    example: entry.example.trim(),
    masteryLabel: MASTERY_LABELS[getMasteryLevel(entry)],
  }));

  return {
    title: 'IPMAT/CUET VOCAB BUILDER',
    subtitle: `Printable Study Sheet · ${categoryLabel} · ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`,
    categoryFilter,
    categoryLabel,
    filename: `ipmat-cuet-study-sheet-${slug}-${dateStamp}.pdf`,
    generatedDateLabel,
    totalCount: rows.length,
    rows,
  };
}

export function generateStudySheetPdfBlob(
  entries: VocabEntry[],
  options: {
    category?: PdfCategoryFilter;
    sortOrder?: PdfSortOrder;
    customLabel?: string;
    now?: Date;
  } = {}
): { blob: Blob; filename: string; entryCount: number; categoryLabel: string } {
  const plan = buildPdfStudySheetPlan(entries, options);
  if (plan.rows.length === 0) {
    throw new Error(`No entries available in ${plan.categoryLabel} to export.`);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });
  doc.setLineHeightFactor(1.35);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  const contentWidth = pageWidth - marginX * 2;

  // Nesoi midnight navy top banner
  doc.setFillColor(0, 41, 98); // #002962
  doc.rect(0, 0, pageWidth, 82, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(plan.title, marginX, 34);

  doc.setTextColor(219, 234, 254); // soft ice blue
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(plan.subtitle, marginX, 53);

  doc.setFontSize(9);
  doc.text(`Generated ${plan.generatedDateLabel}`, pageWidth - marginX, 53, {
    align: 'right',
  });

  const showCategoryCol = plan.categoryFilter === 'all';
  const head = showCategoryCol
    ? [['#', 'Word / Expression', 'Category', 'Meaning', 'Example Sentence', 'Level']]
    : [['#', 'Word / Expression', 'Meaning', 'Example Sentence', 'Level']];

  const body = plan.rows.map((row) =>
    showCategoryCol
      ? [String(row.index), row.expression, row.categoryLabel, row.meaning, row.example, row.masteryLabel]
      : [String(row.index), row.expression, row.meaning, row.example, row.masteryLabel]
  );

  const columnStyles: Record<number, { cellWidth?: number; fontStyle?: 'bold' | 'normal'; halign?: 'center' | 'left' }> = showCategoryCol
    ? {
        0: { cellWidth: 26, halign: 'center' },
        1: { cellWidth: 105, fontStyle: 'bold' },
        2: { cellWidth: 68 },
        3: { cellWidth: 138 },
        4: { cellWidth: contentWidth - 26 - 105 - 68 - 138 - 52 },
        5: { cellWidth: 52, halign: 'center' },
      }
    : {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 118, fontStyle: 'bold' },
        2: { cellWidth: 162 },
        3: { cellWidth: contentWidth - 28 - 118 - 162 - 54 },
        4: { cellWidth: 54, halign: 'center' },
      };

  autoTable(doc, {
    startY: 98,
    margin: { left: marginX, right: marginX, top: 44, bottom: 44 },
    head,
    body,
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [0, 41, 98],
      cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
      valign: 'top',
      overflow: 'linebreak',
      lineColor: [226, 224, 217],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [238, 243, 249],
      textColor: [0, 41, 98],
      fontStyle: 'bold',
      fontSize: 9,
      lineColor: [197, 212, 232],
      lineWidth: 0.75,
    },
    alternateRowStyles: {
      fillColor: [245, 243, 240], // #F5F3F0
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles,
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 224, 217);
    doc.line(marginX, pageHeight - 30, pageWidth - marginX, pageHeight - 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(59, 85, 120);
    doc.text(
      `IPMAT/CUET VOCAB BUILDER · ${plan.categoryLabel}`,
      marginX,
      pageHeight - 18
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 18, {
      align: 'right',
    });
  }

  const blob = doc.output('blob');
  return {
    blob,
    filename: plan.filename,
    entryCount: plan.rows.length,
    categoryLabel: plan.categoryLabel,
  };
}

export function downloadStudySheetPdf(
  entries: VocabEntry[],
  options: {
    category?: PdfCategoryFilter;
    sortOrder?: PdfSortOrder;
    customLabel?: string;
  } = {}
): { filename: string; entryCount: number; categoryLabel: string } {
  const result = generateStudySheetPdfBlob(entries, options);
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return {
    filename: result.filename,
    entryCount: result.entryCount,
    categoryLabel: result.categoryLabel,
  };
}
