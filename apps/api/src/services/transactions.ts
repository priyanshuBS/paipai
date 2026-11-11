import {
  and,
  arrayOverlaps,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  localBucket,
  lt,
  lte,
  normalizedTitle,
  or,
  queryRows,
  sql,
  sumPaiseWhere,
  transactions,
  type Database,
  type SQL,
  type TransactionRow,
} from '@paipai/db';
import { dayKey, rangeFromDateStrings } from '@paipai/shared/date';
import type {
  createTransactionSchema,
  TitleSuggestion,
  Transaction,
  TransactionSort,
  UpdateTransactionInput,
  listTransactionsQuerySchema,
} from '@paipai/shared/schemas';
import type { z } from 'zod';
import { AppError, badRequest, notFound } from '../lib/errors';
import type { UserCtx } from '../types';
import { assertUsableCategory } from './categories';

export type ListQuery = z.output<typeof listTransactionsQuerySchema>;

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    title: row.title,
    note: row.note,
    categoryId: row.categoryId,
    paymentMethod: row.paymentMethod,
    occurredAt: row.occurredAt.toISOString(),
    tags: row.tags,
    location: row.location,
    receiptUrl: row.receiptUrl,
    recurringId: row.recurringId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Escape LIKE wildcards in user input. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

const owned = (userId: string, id: string) =>
  and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt));

/** Truncate to whole milliseconds so keyset cursors round-trip exactly through JS Dates. */
const toMs = (d: Date) => new Date(Math.floor(d.getTime()));

export async function createTransaction(
  db: Database,
  ctx: UserCtx,
  input: z.output<typeof createTransactionSchema>,
): Promise<{ transaction: Transaction; created: boolean }> {
  if (input.categoryId) await assertUsableCategory(db, ctx.userId, input.categoryId, input.type);
  const values = {
    ...(input.id ? { id: input.id } : {}),
    userId: ctx.userId,
    type: input.type,
    amount: input.amount,
    title: input.title,
    note: input.note ?? null,
    categoryId: input.categoryId ?? null,
    paymentMethod: input.paymentMethod,
    occurredAt: toMs(input.occurredAt ? new Date(input.occurredAt) : new Date()),
    tags: input.tags,
    location: input.location ?? null,
    receiptUrl: input.receiptUrl ?? null,
  };
  // Client-supplied ids make offline-queued creates idempotent.
  const [row] = await db
    .insert(transactions)
    .values(values)
    .onConflictDoNothing({ target: transactions.id })
    .returning();
  if (row) return { transaction: toTransaction(row), created: true };
  if (!input.id) throw new AppError(500, 'INTERNAL_ERROR', 'Could not save transaction');
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, input.id), eq(transactions.userId, ctx.userId)))
    .limit(1);
  if (!existing) throw new AppError(409, 'CONFLICT', 'A transaction with this id already exists');
  return { transaction: toTransaction(existing), created: false };
}

export async function getTransaction(db: Database, ctx: UserCtx, id: string): Promise<Transaction> {
  const [row] = await db.select().from(transactions).where(owned(ctx.userId, id)).limit(1);
  if (!row) throw notFound('Transaction');
  return toTransaction(row);
}

export async function updateTransaction(
  db: Database,
  ctx: UserCtx,
  id: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const [current] = await db.select().from(transactions).where(owned(ctx.userId, id)).limit(1);
  if (!current) throw notFound('Transaction');
  const type = input.type ?? current.type;
  const categoryId = input.categoryId !== undefined ? input.categoryId : current.categoryId;
  if (categoryId && (input.categoryId !== undefined || input.type !== undefined)) {
    await assertUsableCategory(db, ctx.userId, categoryId, type);
  }
  const { occurredAt, ...rest } = input;
  const [row] = await db
    .update(transactions)
    .set({ ...rest, ...(occurredAt ? { occurredAt: toMs(new Date(occurredAt)) } : {}) })
    .where(owned(ctx.userId, id))
    .returning();
  if (!row) throw notFound('Transaction');
  return toTransaction(row);
}

export async function softDeleteTransaction(db: Database, ctx: UserCtx, id: string): Promise<void> {
  const res = await db
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(owned(ctx.userId, id))
    .returning({ id: transactions.id });
  if (res.length === 0) throw notFound('Transaction');
}

/** Undo a soft delete. */
export async function restoreTransaction(
  db: Database,
  ctx: UserCtx,
  id: string,
): Promise<Transaction> {
  const [row] = await db
    .update(transactions)
    .set({ deletedAt: null })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, ctx.userId),
        isNotNull(transactions.deletedAt),
      ),
    )
    .returning();
  if (!row) throw notFound('Transaction');
  return toTransaction(row);
}

export async function duplicateTransaction(
  db: Database,
  ctx: UserCtx,
  id: string,
): Promise<Transaction> {
  const [src] = await db.select().from(transactions).where(owned(ctx.userId, id)).limit(1);
  if (!src) throw notFound('Transaction');
  const [row] = await db
    .insert(transactions)
    .values({
      userId: ctx.userId,
      type: src.type,
      amount: src.amount,
      title: src.title,
      note: src.note,
      categoryId: src.categoryId,
      paymentMethod: src.paymentMethod,
      occurredAt: toMs(new Date()),
      tags: src.tags,
      location: src.location,
    })
    .returning();
  if (!row) throw new AppError(500, 'INTERNAL_ERROR', 'Could not duplicate transaction');
  return toTransaction(row);
}

// ── Listing with filters + keyset pagination ────────────────────────────────

interface Cursor {
  /** ISO timestamp for date sorts, paise for amount sorts. */
  v: string | number;
  id: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

export function decodeCursor(raw: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<Cursor>;
    if ((typeof c.v !== 'string' && typeof c.v !== 'number') || typeof c.id !== 'string')
      throw new Error();
    return { v: c.v, id: c.id };
  } catch {
    throw badRequest('Invalid cursor');
  }
}

/** Filters shared by the list and its per-day totals (everything except the cursor). */
function filterConditions(ctx: UserCtx, q: ListQuery): SQL[] {
  const conds: (SQL | undefined)[] = [
    eq(transactions.userId, ctx.userId),
    isNull(transactions.deletedAt),
  ];
  if (q.q) {
    const pattern = `%${escapeLike(q.q)}%`;
    conds.push(or(ilike(transactions.title, pattern), ilike(transactions.note, pattern)));
  }
  if (q.from || q.to) {
    const range = rangeFromDateStrings(q.from ?? '1970-01-01', q.to ?? '9999-12-31', ctx.timezone);
    if (q.from) conds.push(gte(transactions.occurredAt, range.from));
    if (q.to) conds.push(lt(transactions.occurredAt, range.to));
  }
  if (q.type) conds.push(eq(transactions.type, q.type));
  if (q.categoryId?.length) conds.push(inArray(transactions.categoryId, q.categoryId));
  if (q.paymentMethod?.length) conds.push(inArray(transactions.paymentMethod, q.paymentMethod));
  if (q.tags?.length) conds.push(arrayOverlaps(transactions.tags, q.tags));
  if (q.minAmount !== undefined) conds.push(gte(transactions.amount, q.minAmount));
  if (q.maxAmount !== undefined) conds.push(lte(transactions.amount, q.maxAmount));
  return conds.filter((c): c is SQL => c !== undefined);
}

function sortSpec(sort: TransactionSort) {
  const byDate = sort.startsWith('date');
  const descending = sort.endsWith('desc');
  const col = byDate ? transactions.occurredAt : transactions.amount;
  return { byDate, descending, col };
}

export interface DayTotal {
  expense: number;
  income: number;
}

export async function listTransactions(
  db: Database,
  ctx: UserCtx,
  q: ListQuery,
): Promise<{
  items: Transaction[];
  nextCursor: string | null;
  dayTotals: Record<string, DayTotal>;
}> {
  if (q.minAmount !== undefined && q.maxAmount !== undefined && q.minAmount > q.maxAmount) {
    throw badRequest('minAmount must be less than or equal to maxAmount');
  }
  const base = filterConditions(ctx, q);
  const { byDate, descending, col } = sortSpec(q.sort);
  const conds = [...base];

  if (q.cursor) {
    const c = decodeCursor(q.cursor);
    const v = byDate ? new Date(String(c.v)) : Number(c.v);
    if (byDate && Number.isNaN((v as Date).getTime())) throw badRequest('Invalid cursor');
    const cmp = descending ? lt : gt;
    // Keyset: (col, id) strictly after the cursor in sort order.
    conds.push(or(cmp(col, v), and(eq(col, v), cmp(transactions.id, c.id))) as SQL);
  }

  const order = descending ? [desc(col), desc(transactions.id)] : [asc(col), asc(transactions.id)];
  const rows = await db
    .select()
    .from(transactions)
    .where(and(...conds))
    .orderBy(...order)
    .limit(q.limit + 1);

  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;
  const last = page.at(-1);
  const nextCursor =
    hasMore && last
      ? encodeCursor({ v: byDate ? last.occurredAt.toISOString() : last.amount, id: last.id })
      : null;

  // Full-day totals (same filters) for the days that appear on this page.
  const dayTotals: Record<string, DayTotal> = {};
  if (page.length > 0) {
    const day = localBucket(transactions.occurredAt, ctx.timezone, 'day');
    const days = [...new Set(page.map((r) => dayKey(r.occurredAt, ctx.timezone)))];
    const totals = await db
      .select({
        day,
        expense: sumPaiseWhere(transactions.amount, sql`${transactions.type} = 'expense'`),
        income: sumPaiseWhere(transactions.amount, sql`${transactions.type} = 'income'`),
      })
      .from(transactions)
      .where(
        and(
          ...base,
          sql`${day} IN (${sql.join(
            days.map((d) => sql`${d}`),
            sql`, `,
          )})`,
        ),
      )
      .groupBy(sql`1`);
    for (const t of totals) dayTotals[t.day] = { expense: t.expense, income: t.income };
  }

  return { items: page.map(toTransaction), nextCursor, dayTotals };
}

// ── Title autocomplete ──────────────────────────────────────────────────────

export async function suggestTitles(
  db: Database,
  ctx: UserCtx,
  q: string,
  limit: number,
): Promise<TitleSuggestion[]> {
  const key = normalizedTitle(transactions.title);
  const needle = escapeLike(q.trim().replace(/\s+/g, ' ').toLowerCase());
  const match = needle
    ? sql`AND (${key} LIKE ${`${needle}%`} OR ${key} LIKE ${`% ${needle}%`})`
    : sql``;

  const rows = await queryRows<{
    title: string;
    category_id: string | null;
    payment_method: TitleSuggestion['paymentMethod'];
    amount: string | number;
    cnt: string | number;
  }>(
    db,
    sql`
    SELECT title, category_id, payment_method, amount, cnt FROM (
      SELECT
        ${transactions.title} AS title,
        ${transactions.categoryId} AS category_id,
        ${transactions.paymentMethod} AS payment_method,
        ${transactions.amount} AS amount,
        ${transactions.occurredAt} AS occurred_at,
        ${key} LIKE ${`${needle}%`} AS prefix_match,
        count(*) OVER (PARTITION BY ${key}) AS cnt,
        row_number() OVER (PARTITION BY ${key} ORDER BY ${transactions.occurredAt} DESC) AS rn
      FROM ${transactions}
      WHERE ${transactions.userId} = ${ctx.userId} AND ${transactions.deletedAt} IS NULL ${match}
    ) s
    WHERE rn = 1
    ORDER BY prefix_match DESC, cnt DESC, occurred_at DESC
    LIMIT ${limit}
  `,
  );

  return rows.map((r) => ({
    title: r.title,
    categoryId: r.category_id,
    paymentMethod: r.payment_method,
    lastAmount: Number(r.amount),
    count: Number(r.cnt),
  }));
}
