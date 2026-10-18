import { format, parseISO } from 'date-fns';
import type { UserSettings } from '@/types';
import fontUrl from '@/assets/fonts/Inter.ttf?url';
import type { LedgerReport, LedgerReportRow } from './ledgerReport';
import { formatCurrency } from '@/utils/format';

const PAGE_MARGIN = { top: 18, right: 12, bottom: 30, left: 12 };
const FOOTER_RULE_Y = 281;
const PDF_DATE_FORMAT = 'dd MMM yyyy';
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
  const commonOptions = {
    theme: 'grid' as const,
    margin: PAGE_MARGIN,
    styles: {
      font: 'Inter',
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak' as const,
      valign: 'middle' as const,
    },
    headStyles: {
      font: 'Inter',
      fontStyle: 'normal' as const,
      fillColor: [39, 39, 42] as [number, number, number],
      textColor: 255,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' as const },
      1: { cellWidth: 30 },
      2: { cellWidth: 52 },
      3: { cellWidth: 28, halign: 'right' as const },
      4: { cellWidth: 28, halign: 'right' as const },
      5: { cellWidth: 28, halign: 'right' as const },
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
      footStyles: { font: 'Inter', fontStyle: 'normal', fillColor: [39, 39, 42] },
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
      doc.setFontSize(11);
      doc.text(
        `${category.group ? `${category.group} · ` : ''}${category.label}`,
        PAGE_MARGIN.left,
        startY + 5
      );
      autoTable(doc, {
        ...commonOptions,
        startY: startY + 8,
        head: [['Date', 'Account', 'Note', 'Income', 'Expense']],
        body: category.rows.map(row => transactionCells(row, settings).slice(0, 5)),
        foot: [
          [
            'Category total',
            '',
            '',
            formatCurrency(category.income, settings),
            formatCurrency(category.expense, settings),
          ],
        ],
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 32 },
          2: { cellWidth: 63 },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 36, halign: 'right' },
        },
        footStyles: { font: 'Inter', fontStyle: 'normal', fillColor: [39, 39, 42] },
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
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 77 },
          4: { cellWidth: 29, halign: 'right' },
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
