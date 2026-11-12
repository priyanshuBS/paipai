import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { and, asc, categories, eq, gte, isNull, lt, transactions, type Database } from '@paipai/db';
import { dayKey, formatDate, formatTime, rangeFromDateStrings } from '@paipai/shared/date';
import { formatMoney, paiseToRupeesString } from '@paipai/shared/money';
import { PAYMENT_METHOD_LABELS } from '@paipai/shared/schemas';
import { lightColors, palette } from '@paipai/shared/tokens';
import { AppError } from '../lib/errors';
import type { UserCtx } from '../types';

export const MAX_EXPORT_ROWS = 50_000;
const UTF8_BOM = String.fromCharCode(0xfeff);

export interface ExportRow {
  occurredAt: Date;
  type: 'expense' | 'income';
  title: string;
  note: string | null;
  category: string | null;
  paymentMethod: keyof typeof PAYMENT_METHOD_LABELS;
  amount: number;
  tags: string[];
  location: string | null;
}

export async function loadExportRows(
  db: Database,
  ctx: UserCtx,
  from: string,
  to: string,
): Promise<ExportRow[]> {
  const range = rangeFromDateStrings(from, to, ctx.timezone);
  const rows = await db
    .select({
      occurredAt: transactions.occurredAt,
      type: transactions.type,
      title: transactions.title,
      note: transactions.note,
      category: categories.name,
      paymentMethod: transactions.paymentMethod,
      amount: transactions.amount,
      tags: transactions.tags,
      location: transactions.location,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, ctx.userId),
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, range.from),
        lt(transactions.occurredAt, range.to),
      ),
    )
    .orderBy(asc(transactions.occurredAt))
    .limit(MAX_EXPORT_ROWS + 1);
  if (rows.length > MAX_EXPORT_ROWS) {
    throw new AppError(
      413,
      'EXPORT_TOO_LARGE',
      'Too many transactions in this range. Please export a shorter period.',
    );
  }
  return rows;
}

/** CSV cell: quote when needed and neutralise spreadsheet formula injection. */
export function csvCell(value: string): string {
  let v = value;
  // Plain numbers (e.g. -30.50) stay numeric; anything else that starts like a formula is escaped.
  if (/^[=+\-@\t\r]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function buildCsv(rows: ExportRow[], ctx: UserCtx & { currency: string }): string {
  const header = [
    'Date',
    'Time',
    'Type',
    'Title',
    'Note',
    'Category',
    'Payment method',
    'Amount',
    'Currency',
    'Tags',
    'Location',
  ];
  const lines = rows.map((r) =>
    [
      dayKey(r.occurredAt, ctx.timezone),
      formatTime(r.occurredAt, ctx.timezone),
      r.type === 'expense' ? 'Expense' : 'Income',
      r.title,
      r.note ?? '',
      r.category ?? 'Uncategorised',
      PAYMENT_METHOD_LABELS[r.paymentMethod],
      // Expenses negative so the column sums to the net.
      (r.type === 'expense' ? '-' : '') + paiseToRupeesString(r.amount),
      ctx.currency,
      r.tags.join('; '),
      r.location ?? '',
    ]
      .map(csvCell)
      .join(','),
  );
  // BOM so Excel opens UTF-8 (₹, Hindi text) correctly.
  return `${UTF8_BOM}${[header.join(','), ...lines].join('\r\n')}\r\n`;
}

// ── PDF ─────────────────────────────────────────────────────────────────────

const here = path.dirname(fileURLToPath(import.meta.url));
function fontPath(file: string): string {
  // src/services -> ../../assets ; dist -> ../assets
  for (const p of [
    path.resolve(here, '../../assets/fonts', file),
    path.resolve(here, '../assets/fonts', file),
  ]) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Font not found: ${file}`);
}

export function buildPdf(
  rows: ExportRow[],
  ctx: UserCtx & { currency: string; name: string },
  from: string,
  to: string,
): Promise<Buffer> {
  const fmt = (p: number) => formatMoney(p, { currency: ctx.currency, trimZeroPaise: false });
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
    info: { Title: `PaiPai statement ${from} to ${to}`, Author: 'PaiPai' },
  });
  doc.registerFont('Inter', fontPath('Inter_400Regular.ttf'));
  doc.registerFont('Inter-SemiBold', fontPath('Inter_600SemiBold.ttf'));
  doc.registerFont('Inter-ExtraBold', fontPath('Inter_800ExtraBold.ttf'));

  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const W = doc.page.width;
  const left = 40;
  const right = W - 40;

  // Header: mark + name on white, hairline rule below.
  const INK = palette.ink;
  const MUTED = lightColors.textSecondary;
  const RULE = lightColors.border;
  doc.roundedRect(left, 32, 26, 26, 6.5).fill(INK);
  doc.roundedRect(left + 6.5, 39.5, 13, 3.25, 1.6).fill('#FAFAFA');
  doc
    .roundedRect(left + 6.5, 47, 7.6, 3.25, 1.6)
    .fillOpacity(0.6)
    .fill('#FAFAFA')
    .fillOpacity(1);
  doc
    .fillColor(INK)
    .font('Inter-SemiBold')
    .fontSize(16)
    .text('PaiPai', left + 36, 33);
  doc
    .fillColor(MUTED)
    .font('Inter')
    .fontSize(9)
    .text('Paai-paai ka hisaab', left + 36, 51);
  doc
    .fillColor(INK)
    .font('Inter-SemiBold')
    .fontSize(12)
    .text('Statement', 0, 34, { align: 'right', width: right });
  doc
    .fillColor(MUTED)
    .font('Inter')
    .fontSize(10)
    .text(
      `${formatDate(rangeFromDateStrings(from, from, ctx.timezone).from, ctx.timezone)} – ${formatDate(rangeFromDateStrings(to, to, ctx.timezone).from, ctx.timezone)}`,
      0,
      52,
      {
        align: 'right',
        width: right,
      },
    );
  doc.moveTo(left, 82).lineTo(right, 82).lineWidth(0.75).strokeColor(RULE).stroke();

  // Summary
  const expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const income = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  let y = 120;
  doc.fillColor(INK).font('Inter-SemiBold').fontSize(11).text(ctx.name, left, y);
  doc
    .fillColor(MUTED)
    .font('Inter')
    .fontSize(9)
    .text(`${rows.length} transactions · times in ${ctx.timezone}`, left, y + 15);
  y += 42;
  const boxW = (right - left - 20) / 3;
  [
    ['Spent', fmt(expense), INK],
    ['Income', fmt(income), palette.income],
    ['Net', fmt(income - expense), INK],
  ].forEach(([label, value, color], i) => {
    const x = left + i * (boxW + 10);
    doc.roundedRect(x, y, boxW, 54, 8).lineWidth(0.75).fillAndStroke('#FFFFFF', RULE);
    doc
      .fillColor(MUTED)
      .font('Inter')
      .fontSize(9)
      .text(label as string, x + 12, y + 10);
    doc
      .fillColor(color as string)
      .font('Inter-SemiBold')
      .fontSize(14)
      .text(value as string, x + 12, y + 26, { width: boxW - 24 });
  });
  y += 74;

  // Category totals (expenses)
  const byCat = new Map<string, number>();
  for (const r of rows)
    if (r.type === 'expense')
      byCat.set(
        r.category ?? 'Uncategorised',
        (byCat.get(r.category ?? 'Uncategorised') ?? 0) + r.amount,
      );
  if (byCat.size) {
    doc.fillColor(INK).font('Inter-SemiBold').fontSize(12).text('Spending by category', left, y);
    y += 20;
    for (const [name, total] of [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      const pct = expense ? total / expense : 0;
      doc.fillColor(INK).font('Inter').fontSize(9.5).text(name, left, y, { width: 150 });
      doc.roundedRect(left + 155, y + 3, (right - left - 260) * pct + 2, 6, 3).fill(palette.cobalt);
      doc.fillColor(INK).text(`${fmt(total)}  ·  ${Math.round(pct * 1000) / 10}%`, right - 100, y, {
        width: 100,
        align: 'right',
      });
      y += 16;
    }
    y += 14;
  }

  // Transactions table
  const cols = [
    { label: 'Date', x: left, w: 70 },
    { label: 'Title', x: left + 72, w: 170 },
    { label: 'Category', x: left + 245, w: 105 },
    { label: 'Paid with', x: left + 352, w: 55 },
    { label: 'Amount', x: left + 410, w: right - left - 410 },
  ] as const;
  const headerRow = () => {
    doc.rect(left, y - 4, right - left, 18).fill(lightColors.surfaceMuted);
    doc.fillColor(MUTED).font('Inter-SemiBold').fontSize(9);
    for (const c of cols)
      doc.text(c.label, c.x + 4, y, {
        width: c.w - 8,
        align: c.label === 'Amount' ? 'right' : 'left',
      });
    y += 20;
  };
  headerRow();
  doc.font('Inter').fontSize(9);
  rows.forEach((r, i) => {
    const title = r.note ? `${r.title} — ${r.note}` : r.title;
    const h = Math.max(14, doc.heightOfString(title, { width: cols[1].w - 8 }) + 4);
    if (y + h > doc.page.height - 50) {
      doc.addPage();
      y = 40;
      headerRow();
      doc.font('Inter').fontSize(9);
    }
    if (i % 2 === 1) doc.rect(left, y - 2, right - left, h).fill('#FAFAFA');
    doc.fillColor(INK);
    doc.text(formatDate(r.occurredAt, ctx.timezone), cols[0].x + 4, y, { width: cols[0].w - 8 });
    doc.text(title, cols[1].x + 4, y, { width: cols[1].w - 8 });
    doc
      .fillColor(MUTED)
      .text(r.category ?? 'Uncategorised', cols[2].x + 4, y, { width: cols[2].w - 8 });
    doc.text(PAYMENT_METHOD_LABELS[r.paymentMethod], cols[3].x + 4, y, { width: cols[3].w - 8 });
    doc
      .fillColor(r.type === 'expense' ? INK : palette.income)
      .text(`${r.type === 'expense' ? '−' : '+'}${fmt(r.amount)}`, cols[4].x + 4, y, {
        width: cols[4].w - 8,
        align: 'right',
      });
    y += h;
  });
  if (rows.length === 0) doc.fillColor(MUTED).text('No transactions in this period.', left, y);

  // Footer with page numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fillColor('#9CA3AF')
      .font('Inter')
      .fontSize(8)
      .text(`Generated by PaiPai · Page ${i + 1} of ${range.count}`, left, doc.page.height - 30, {
        width: right - left,
        align: 'center',
        lineBreak: false,
      });
  }
  doc.end();
  return done;
}
