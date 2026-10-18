import { format, parseISO } from 'date-fns';
import type { UserSettings } from '@/types';
import fontUrl from '@/assets/fonts/Inter.ttf?url';
import type { LedgerReport, LedgerReportRow } from './ledgerReport';
import { formatCurrency } from '@/utils/format';

const PAGE_MARGIN = { top: 18, right: 12, bottom: 30, left: 12 };
const FOOTER_RULE_Y = 281;
const PDF_DATE_FORMAT = 'dd MMM yyyy';
const TABLE_HEADER_FILL: [number, number, number] = [243, 235, 255];
const logoUrl = `${import.meta.env.BASE_URL}moniq-wordmark-dark.svg`;

function toBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function formatLedgerReportDate(iso: string) {
  return format(parseISO(iso), PDF_DATE_FORMAT);
}

const dateLabel = formatLedgerReportDate;

async function loadLogoDataUrl() {
  const response = await fetch(logoUrl);
  if (!response.ok) throw new Error('Could not load the Moniq logo');
  const svg = await response.text();
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the Moniq logo');
    context.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function transactionCells(row: LedgerReportRow, settings: UserSettings) {
  return [
    dateLabel(row.date),
    row.account,
    row.note,
    row.income ? formatCurrency(row.income, settings) : '',
    row.expense ? formatCurrency(row.expense, settings) : '',
    row.transfer ? formatCurrency(row.transfer, settings) : '',
  ];
}

interface FlexibleColumn {
  index: number;
  header: string;
  values: string[];
  minWidth: number;
  maxWidth: number;
  halign: 'center' | 'right';
}

function transactionColumnStyles(
  doc: import('jspdf').jsPDF,
  tableWidth: number,
  noteIndex: number,
  flexibleColumns: FlexibleColumn[]
) {
  const dateWidth = 20;
  const noteMinWidth = 32;
  const horizontalCellPadding = 4;
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7.5);

  const targets = flexibleColumns.map(column => {
    const widestText = Math.max(
      doc.getTextWidth(column.header),
      ...column.values.map(value => doc.getTextWidth(value))
    );
    return Math.min(column.maxWidth, Math.max(column.minWidth, widestText + horizontalCellPadding));
  });
  const flexibleBudget = tableWidth - dateWidth - noteMinWidth;
  const targetTotal = targets.reduce((total, width) => total + width, 0);
  const minimumTotal = flexibleColumns.reduce((total, column) => total + column.minWidth, 0);
  const shrinkRatio =
    targetTotal > flexibleBudget
      ? Math.min(1, (targetTotal - flexibleBudget) / (targetTotal - minimumTotal))
      : 0;
  const widths = targets.map((target, index) => {
    const minimum = flexibleColumns[index].minWidth;
    return target - (target - minimum) * shrinkRatio;
  });

  const styles: Record<number, { cellWidth: number; halign: 'left' | 'center' | 'right' }> = {
    0: { cellWidth: dateWidth, halign: 'center' },
  };
  flexibleColumns.forEach((column, index) => {
    styles[column.index] = { cellWidth: widths[index], halign: column.halign };
  });
  styles[noteIndex] = {
    cellWidth: tableWidth - dateWidth - widths.reduce((total, width) => total + width, 0),
    halign: 'left',
  };
  return styles;
}

/** Generates and downloads the selected ledger report as a locally generated PDF. */
export async function downloadLedgerPdf(report: LedgerReport, settings: UserSettings) {
  const [{ jsPDF }, { default: autoTable }, fontResponse, logoDataUrl] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    fetch(fontUrl),
    loadLogoDataUrl(),
  ]);
  if (!fontResponse.ok) throw new Error('Could not load the PDF font');
  const fontBytes = new Uint8Array(await fontResponse.arrayBuffer());

  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  doc.addFileToVFS('Inter.ttf', toBase64(fontBytes));
  doc.addFont('Inter.ttf', 'Inter', 'normal');
  doc.setFont('Inter', 'normal');

  const rangeLabel = `${dateLabel(report.startDate)} – ${dateLabel(report.endDate)}`;
  const generatedAt = new Date();
  const generatedLabel = `${format(generatedAt, PDF_DATE_FORMAT)} ${format(generatedAt, 'HH:mm')}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightEdge = pageWidth - PAGE_MARGIN.right;
  doc.addImage(logoDataUrl, 'PNG', PAGE_MARGIN.left, 10, 34, 9.6);
  doc.setFont('Inter', 'normal');
  doc.setTextColor(9, 9, 11);
  doc.setFontSize(24);
  doc.text(report.layout === 'category' ? 'CATEGORY REPORT' : 'DAY BOOK', PAGE_MARGIN.left, 29);

  doc.setTextColor(113, 113, 122);
  doc.setFontSize(7);
  doc.text('REPORTING PERIOD', rightEdge, 14, { align: 'right' });
  doc.setTextColor(9, 9, 11);
  doc.setFontSize(11);
  doc.text(rangeLabel, rightEdge, 19, { align: 'right' });
  doc.setTextColor(113, 113, 122);
  doc.setFontSize(7);
  doc.text(`Generated on ${generatedLabel}`, rightEdge, 29, { align: 'right' });

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.4);
  doc.line(PAGE_MARGIN.left, 35, rightEdge, 35);

  let startY = 40;
  const headers = ['Date', 'Account', 'Note', 'Income', 'Expense', 'Transfer'];
  const tableWidth = pageWidth - PAGE_MARGIN.left - PAGE_MARGIN.right;
  const commonOptions = {
    theme: 'grid' as const,
    tableWidth,
    margin: PAGE_MARGIN,
    styles: {
      font: 'Inter',
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak' as const,
      valign: 'top' as const,
      lineColor: [228, 228, 231] as [number, number, number],
      lineWidth: 0.15,
    },
    headStyles: {
      font: 'Inter',
      fontStyle: 'normal' as const,
      fillColor: TABLE_HEADER_FILL,
      textColor: [9, 9, 11] as [number, number, number],
      valign: 'middle' as const,
    },
    showHead: 'everyPage' as const,
    rowPageBreak: 'avoid' as const,
  };

  if (report.layout === 'full') {
    autoTable(doc, {
      ...commonOptions,
      startY,
      head: [headers],
      body: report.rows.map(row => transactionCells(row, settings)),
      columnStyles: transactionColumnStyles(doc, tableWidth, 2, [
        {
          index: 1,
          header: 'Account',
          values: report.rows.map(row => row.account),
          minWidth: 16,
          maxWidth: 55,
          halign: 'center',
        },
        {
          index: 3,
          header: 'Income',
          values: [
            ...report.rows.map(row => (row.income ? formatCurrency(row.income, settings) : '')),
            formatCurrency(report.income, settings),
          ],
          minWidth: 16,
          maxWidth: 30,
          halign: 'right',
        },
        {
          index: 4,
          header: 'Expense',
          values: [
            ...report.rows.map(row => (row.expense ? formatCurrency(row.expense, settings) : '')),
            formatCurrency(report.expense, settings),
          ],
          minWidth: 17,
          maxWidth: 30,
          halign: 'right',
        },
        {
          index: 5,
          header: 'Transfer',
          values: [
            ...report.rows.map(row => (row.transfer ? formatCurrency(row.transfer, settings) : '')),
            formatCurrency(report.transferTotal, settings),
          ],
          minWidth: 18,
          maxWidth: 30,
          halign: 'center',
        },
      ]),
      foot: [
        [
          'Total',
          '',
          '',
          formatCurrency(report.income, settings),
          formatCurrency(report.expense, settings),
          formatCurrency(report.transferTotal, settings),
        ],
      ],
      footStyles: {
        font: 'Inter',
        fontStyle: 'normal',
        fillColor: [244, 244, 245],
        textColor: [9, 9, 11],
        halign: 'right',
        valign: 'middle',
      },
    });
    startY =
      (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  } else {
    for (const category of report.categories) {
      if (startY > 255) {
        doc.addPage();
        startY = PAGE_MARGIN.top;
      }
      doc.setFont('Inter', 'normal');
      doc.setTextColor(9, 9, 11);
      doc.setFontSize(13);
      doc.text(category.label, PAGE_MARGIN.left, startY + 5);
      autoTable(doc, {
        ...commonOptions,
        startY: startY + 8,
        head: [['Date', 'Account', 'Note', 'Income', 'Expense']],
        body: category.rows.map(row => transactionCells(row, settings).slice(0, 5)),
        foot: [
          [
            '',
            '',
            '',
            formatCurrency(category.income, settings),
            formatCurrency(category.expense, settings),
          ],
        ],
        columnStyles: transactionColumnStyles(doc, tableWidth, 2, [
          {
            index: 1,
            header: 'Account',
            values: category.rows.map(row => row.account),
            minWidth: 16,
            maxWidth: 55,
            halign: 'center',
          },
          {
            index: 3,
            header: 'Income',
            values: [
              ...category.rows.map(row => (row.income ? formatCurrency(row.income, settings) : '')),
              formatCurrency(category.income, settings),
            ],
            minWidth: 16,
            maxWidth: 30,
            halign: 'right',
          },
          {
            index: 4,
            header: 'Expense',
            values: [
              ...category.rows.map(row =>
                row.expense ? formatCurrency(row.expense, settings) : ''
              ),
              formatCurrency(category.expense, settings),
            ],
            minWidth: 17,
            maxWidth: 30,
            halign: 'right',
          },
        ]),
        footStyles: {
          font: 'Inter',
          fontStyle: 'normal',
          fillColor: [244, 244, 245],
          textColor: [9, 9, 11],
          halign: 'right',
          valign: 'middle',
        },
      });
      startY =
        (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
        startY;
      startY += 8;
    }

    if (report.transfers.length > 0) {
      if (startY > 255) {
        doc.addPage();
        startY = PAGE_MARGIN.top;
      }
      doc.setFont('Inter', 'normal');
      doc.setFontSize(11);
      doc.text('Transfers', PAGE_MARGIN.left, startY + 5);
      autoTable(doc, {
        ...commonOptions,
        startY: startY + 8,
        head: [['Date', 'From account', 'To account', 'Note', 'Amount']],
        body: report.transfers.map(transfer => [
          dateLabel(transfer.date),
          transfer.fromAccount,
          transfer.toAccount,
          transfer.note,
          formatCurrency(transfer.transfer, settings),
        ]),
        foot: [['Transfer total', '', '', '', formatCurrency(report.transferTotal, settings)]],
        columnStyles: transactionColumnStyles(doc, tableWidth, 3, [
          {
            index: 1,
            header: 'From account',
            values: report.transfers.map(transfer => transfer.fromAccount),
            minWidth: 24,
            maxWidth: 55,
            halign: 'center',
          },
          {
            index: 2,
            header: 'To account',
            values: report.transfers.map(transfer => transfer.toAccount),
            minWidth: 22,
            maxWidth: 55,
            halign: 'center',
          },
          {
            index: 4,
            header: 'Amount',
            values: [
              ...report.transfers.map(transfer => formatCurrency(transfer.transfer, settings)),
              formatCurrency(report.transferTotal, settings),
            ],
            minWidth: 18,
            maxWidth: 30,
            halign: 'center',
          },
        ]),
        footStyles: {
          font: 'Inter',
          fontStyle: 'normal',
          fillColor: [244, 244, 245],
          textColor: [9, 9, 11],
          halign: 'right',
          valign: 'middle',
        },
      });
      startY =
        (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
        startY;
      startY += 8;
    }
  }

  if (startY > 245) {
    doc.addPage();
    startY = PAGE_MARGIN.top;
  }
  doc.setFont('Inter', 'normal');
  doc.setFontSize(12);
  doc.text('Range summary', PAGE_MARGIN.left, startY + 5);
  autoTable(doc, {
    ...commonOptions,
    startY: startY + 8,
    head: [['Summary', 'Amount']],
    body: [
      ['Total income', formatCurrency(report.income, settings)],
      ['Total expenses', formatCurrency(report.expense, settings)],
      ['Total transfers', formatCurrency(report.transferTotal, settings)],
      ['Net income', formatCurrency(report.netIncome, settings)],
      ['Opening Net Liquid Assets', formatCurrency(report.openingNetLiquidAssets, settings)],
      ['Closing Net Liquid Assets', formatCurrency(report.closingNetLiquidAssets, settings)],
    ],
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60, halign: 'right' } },
  });

  const balanceTop =
    (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  if (report.accountBalances.length > 0) {
    if (balanceTop > 245) doc.addPage();
    const balancesStartY = balanceTop > 245 ? PAGE_MARGIN.top : balanceTop + 8;
    doc.setFont('Inter', 'normal');
    doc.setFontSize(12);
    doc.text('Account balances', PAGE_MARGIN.left, balancesStartY + 5);
    autoTable(doc, {
      ...commonOptions,
      startY: balancesStartY + 8,
      head: [['Account', 'Opening balance', 'Closing balance']],
      body: report.accountBalances.map(balance => [
        balance.account,
        formatCurrency(balance.opening, settings),
        formatCurrency(balance.closing, settings),
      ]),
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 45, halign: 'right' },
        2: { cellWidth: 45, halign: 'right' },
      },
    });
  }

  const finalTableY =
    (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    balanceTop;
  const pageHeight = doc.internal.pageSize.getHeight();
  const noteY = finalTableY + 7;
  const noteNeedsOwnPage = noteY > pageHeight - 31;
  if (noteNeedsOwnPage) doc.addPage();
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text(
    'Opening and closing balances include full account history through each boundary date. Transfers affect balances but are excluded from income and expense totals.',
    PAGE_MARGIN.left,
    noteNeedsOwnPage ? PAGE_MARGIN.top : noteY,
    { maxWidth: pageWidth - PAGE_MARGIN.left - PAGE_MARGIN.right }
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    const footerRight = pageWidth - PAGE_MARGIN.right;
    const footerLogoWidth = 12;
    const footerLogoHeight = (footerLogoWidth * 219) / 776;
    const generatedLabel = 'Generated with';
    doc.setDrawColor(134, 59, 255);
    doc.setLineWidth(0.25);
    doc.line(PAGE_MARGIN.left, FOOTER_RULE_Y, footerRight, FOOTER_RULE_Y);

    doc.setFont('Inter', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(`Page ${page} of ${pageCount}`, PAGE_MARGIN.left, 286);

    doc.setFontSize(7);
    doc.setTextColor(63, 63, 70);
    const generatedWidth = doc.getTextWidth(generatedLabel);
    const generatedLogoGap = 1.5;
    const generatedStartX = footerRight - generatedWidth - generatedLogoGap - footerLogoWidth;
    doc.text(generatedLabel, generatedStartX, 286);
    doc.addImage(
      logoDataUrl,
      'PNG',
      generatedStartX + generatedWidth + generatedLogoGap,
      283.1,
      footerLogoWidth,
      footerLogoHeight
    );

    const website = 'moniq.donsabu.com';
    doc.setTextColor(134, 59, 255);
    doc.text(website, pageWidth / 2, 286, { align: 'center' });
    const websiteWidth = doc.getTextWidth(website);
    doc.link(pageWidth / 2 - websiteWidth / 2, 281, websiteWidth, 7, {
      url: 'https://moniq.donsabu.com',
    });
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`moniq-ledger-${report.startDate}-to-${report.endDate}.pdf`);
}
