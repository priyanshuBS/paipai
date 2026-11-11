/**
 * Analytics. Every aggregation runs in Postgres (GROUP BY on timezone-aware
 * date_trunc); JavaScript only resolves date ranges and shapes the output.
 */
import {
  and,
  categories,
  countWhere,
  eq,
  gte,
  isNull,
  localBucket,
  localDow,
  localHour,
  lt,
  normalizedTitle,
  queryRows,
  sql,
  sumPaise,
  sumPaiseWhere,
  transactions,
  tzLiteral,
  type Database,
  type SQL,
} from '@paipai/db';
import {
  getPeriodRange,
  getPreviousPeriodRange,
  parseDateInTz,
  rangeFromDateStrings,
  type DateRange,
} from '@paipai/shared/date';
import type {
  AnalyticsPeriod,
  AnalyticsSummary,
  CategoryBreakdownRow,
  ItemBreakdownRow,
  PatternRow,
  PaymentMethodRow,
  TimeseriesPoint,
  TransactionType,
} from '@paipai/shared/schemas';
import { badRequest, notFound } from '../lib/errors';
import type { UserCtx } from '../types';
import { toTransaction } from './transactions';
import type { Transaction } from '@paipai/shared/schemas';

export type Granularity = 'day' | 'week' | 'month';

export interface ResolvedRange {
  period: AnalyticsPeriod;
  range: DateRange;
  previous: DateRange;
}

/** Turn a period/date or from/to query into concrete UTC ranges in the user's timezone. */
export function resolveRange(
  q: { period: AnalyticsPeriod; date?: string; from?: string; to?: string },
  tz: string,
  now: Date = new Date(),
): ResolvedRange {
  if (q.period === 'custom') {
    if (!q.from || !q.to) throw badRequest('from and to are required for a custom period');
    const range = rangeFromDateStrings(q.from, q.to, tz);
    return { period: 'custom', range, previous: getPreviousPeriodRange('custom', range, tz) };
  }
  const anchor = q.date ? parseDateInTz(q.date, tz) : now;
  const range = getPeriodRange(q.period, anchor, tz);
  return { period: q.period, range, previous: getPreviousPeriodRange(q.period, range, tz) };
}

const baseWhere = (userId: string): SQL[] => [
  eq(transactions.userId, userId),
  isNull(transactions.deletedAt),
];

const inRange = (r: DateRange): SQL =>
  sql`${transactions.occurredAt} >= ${r.from.toISOString()}::timestamptz AND ${transactions.occurredAt} < ${r.to.toISOString()}::timestamptz`;

const rangeWhere = (r: DateRange) => [
  gte(transactions.occurredAt, r.from),
  lt(transactions.occurredAt, r.to),
];

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// ── Summary ─────────────────────────────────────────────────────────────────

export async function getSummary(
  db: Database,
  ctx: UserCtx,
  resolved: ResolvedRange,
  type: TransactionType,
  now: Date = new Date(),
): Promise<AnalyticsSummary> {
  const { range, previous } = resolved;
  const today = getPeriodRange('day', now, ctx.timezone);
  const week = getPeriodRange('week', now, ctx.timezone);
  const month = getPeriodRange('month', now, ctx.timezone);
  const isExpense = sql`${transactions.type} = 'expense'`;
  const isIncome = sql`${transactions.type} = 'income'`;
  const isType = sql`${transactions.type} = ${type}`;

  const lower = new Date(
    Math.min(
      range.from.getTime(),
      previous.from.getTime(),
      month.from.getTime(),
      week.from.getTime(),
    ),
  );
  const upper = new Date(Math.max(range.to.getTime(), month.to.getTime(), week.to.getTime()));

  const [row] = await db
    .select({
      totalExpense: sumPaiseWhere(transactions.amount, sql`${isExpense} AND ${inRange(range)}`),
      totalIncome: sumPaiseWhere(transactions.amount, sql`${isIncome} AND ${inRange(range)}`),
      count: countWhere(sql`${isType} AND ${inRange(range)}`),
      previousTotal: sumPaiseWhere(transactions.amount, sql`${isType} AND ${inRange(previous)}`),
      today: sumPaiseWhere(transactions.amount, sql`${isExpense} AND ${inRange(today)}`),
      thisWeek: sumPaiseWhere(transactions.amount, sql`${isExpense} AND ${inRange(week)}`),
      thisMonth: sumPaiseWhere(transactions.amount, sql`${isExpense} AND ${inRange(month)}`),
    })
    .from(transactions)
    .where(
      and(
        ...baseWhere(ctx.userId),
        gte(transactions.occurredAt, lower),
        lt(transactions.occurredAt, upper),
      ),
    );

  const r = row ?? {
    totalExpense: 0,
    totalIncome: 0,
    count: 0,
    previousTotal: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  };
  const current = type === 'expense' ? r.totalExpense : r.totalIncome;
  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    totalExpense: r.totalExpense,
    totalIncome: r.totalIncome,
    net: r.totalIncome - r.totalExpense,
    count: r.count,
    previousTotal: r.previousTotal,
    changePercent: percentChange(current, r.previousTotal),
    today: r.today,
    thisWeek: r.thisWeek,
    thisMonth: r.thisMonth,
  };
}

// ── Time series ─────────────────────────────────────────────────────────────

const MAX_BUCKETS: Record<Granularity, number> = { day: 400, week: 260, month: 120 };

export async function getTimeseries(
  db: Database,
  ctx: UserCtx,
  range: DateRange,
  granularity: Granularity,
  type: TransactionType,
): Promise<TimeseriesPoint[]> {
  const approxDays = (range.to.getTime() - range.from.getTime()) / 86_400_000;
  const approxBuckets =
    granularity === 'day' ? approxDays : granularity === 'week' ? approxDays / 7 : approxDays / 28;
  if (approxBuckets > MAX_BUCKETS[granularity]) {
    throw badRequest(`Range too large for ${granularity} granularity`);
  }
  const tz = tzLiteral(ctx.timezone);
  const unit = sql.raw(`'${granularity}'`);
  const step = sql.raw(`'1 ${granularity}'`);
  const from = range.from.toISOString();
  const to = range.to.toISOString();

  const rows = await queryRows<{ bucket: string; total: string | number; count: string | number }>(
    db,
    sql`
    WITH buckets AS (
      SELECT generate_series(
        date_trunc(${unit}, ${from}::timestamptz AT TIME ZONE ${tz}),
        date_trunc(${unit}, (${to}::timestamptz - interval '1 microsecond') AT TIME ZONE ${tz}),
        ${step}::interval
      ) AS b
    ),
    agg AS (
      SELECT date_trunc(${unit}, ${transactions.occurredAt} AT TIME ZONE ${tz}) AS b,
             sum(${transactions.amount}) AS total,
             count(*) AS n
      FROM ${transactions}
      WHERE ${transactions.userId} = ${ctx.userId}
        AND ${transactions.deletedAt} IS NULL
        AND ${transactions.type} = ${type}
        AND ${inRange(range)}
      GROUP BY 1
    )
    SELECT to_char(buckets.b, 'YYYY-MM-DD') AS bucket,
           coalesce(agg.total, 0)::bigint AS total,
           coalesce(agg.n, 0)::int AS count
    FROM buckets LEFT JOIN agg ON agg.b = buckets.b
    ORDER BY buckets.b
  `,
  );
  return rows.map((r) => ({ bucket: r.bucket, total: Number(r.total), count: Number(r.count) }));
}

// ── Category breakdown ──────────────────────────────────────────────────────

export async function getCategoryBreakdown(
  db: Database,
  ctx: UserCtx,
  range: DateRange,
  type: TransactionType,
  limit = 50,
): Promise<CategoryBreakdownRow[]> {
  const total = sumPaise(transactions.amount);
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: sql<string>`coalesce(${categories.name}, 'Uncategorised')`,
      icon: sql<string>`coalesce(${categories.icon}, 'circle-help')`,
      color: sql<string>`coalesce(${categories.color}, '#BFC7D5')`,
      total,
      count: sql<number>`count(*)::int`.mapWith(Number),
      // Window over all groups (computed before LIMIT), so percentages are of the full total.
      percent:
        sql<number>`round(sum(${transactions.amount}) * 100.0 / nullif(sum(sum(${transactions.amount})) OVER (), 0), 1)`.mapWith(
          Number,
        ),
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...baseWhere(ctx.userId), eq(transactions.type, type), ...rangeWhere(range)))
    .groupBy(transactions.categoryId, categories.name, categories.icon, categories.color)
    .orderBy(sql`5 DESC`, sql`2 ASC`)
    .limit(limit);
  return rows.map((r) => ({ ...r, percent: r.percent || 0 }));
}

// ── Item-wise ───────────────────────────────────────────────────────────────

export async function getItemBreakdown(
  db: Database,
  ctx: UserCtx,
  range: DateRange,
  type: TransactionType,
  opts: { limit?: number; q?: string } = {},
): Promise<ItemBreakdownRow[]> {
  const key = normalizedTitle(transactions.title);
  const needle = opts.q?.trim().replace(/\s+/g, ' ').toLowerCase();
  const rows = await db
    .select({
      key,
      title: sql<string>`(array_agg(${transactions.title} ORDER BY ${transactions.occurredAt} DESC))[1]`,
      total: sumPaise(transactions.amount),
      count: sql<number>`count(*)::int`.mapWith(Number),
      average: sql<number>`round(avg(${transactions.amount}))::bigint`.mapWith(Number),
      lastAt: sql<string>`max(${transactions.occurredAt})`.mapWith((v: string | Date) =>
        new Date(v).toISOString(),
      ),
      categoryId: sql<
        string | null
      >`(array_agg(${transactions.categoryId} ORDER BY ${transactions.occurredAt} DESC))[1]`,
    })
    .from(transactions)
    .where(
      and(
        ...baseWhere(ctx.userId),
        eq(transactions.type, type),
        ...rangeWhere(range),
        needle ? sql`${key} LIKE ${`%${needle.replace(/[\\%_]/g, (m) => `\\${m}`)}%`}` : undefined,
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`3 DESC`, sql`1 ASC`)
    .limit(opts.limit ?? 50);
  return rows;
}

export interface ItemDetail {
  key: string;
  title: string;
  total: number;
  count: number;
  average: number;
  firstAt: string | null;
  lastAt: string | null;
  granularity: Granularity;
  series: TimeseriesPoint[];
  transactions: Transaction[];
}

export async function getItemDetail(
  db: Database,
  ctx: UserCtx,
  rawTitle: string,
  range: DateRange | null,
): Promise<ItemDetail> {
  const keyValue = rawTitle.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!keyValue) throw badRequest('Title is required');
  const key = normalizedTitle(transactions.title);
  const where = and(
    ...baseWhere(ctx.userId),
    sql`${key} = ${keyValue}`,
    ...(range ? rangeWhere(range) : []),
  );

  const [stats] = await db
    .select({
      title: sql<
        string | null
      >`(array_agg(${transactions.title} ORDER BY ${transactions.occurredAt} DESC))[1]`,
      total: sumPaise(transactions.amount),
      count: sql<number>`count(*)::int`.mapWith(Number),
      average: sql<number>`coalesce(round(avg(${transactions.amount})), 0)::bigint`.mapWith(Number),
      firstAt: sql<Date | null>`min(${transactions.occurredAt})`,
      lastAt: sql<Date | null>`max(${transactions.occurredAt})`,
    })
    .from(transactions)
    .where(where);

  if (!stats || stats.count === 0 || !stats.title || !stats.firstAt || !stats.lastAt)
    throw notFound('Item');
  const firstAt = new Date(stats.firstAt);
  const lastAt = new Date(stats.lastAt);

  // History chart: daily for short spans, monthly otherwise.
  const seriesRange: DateRange = range ?? {
    from: getPeriodRange('month', firstAt, ctx.timezone).from,
    to: getPeriodRange('month', lastAt, ctx.timezone).to,
  };
  const spanDays = (seriesRange.to.getTime() - seriesRange.from.getTime()) / 86_400_000;
  const granularity: Granularity = spanDays <= 62 ? 'day' : spanDays <= 366 ? 'week' : 'month';
  const bucket = localBucket(transactions.occurredAt, ctx.timezone, granularity);

  const [seriesRows, recent] = await Promise.all([
    db
      .select({
        bucket,
        total: sumPaise(transactions.amount),
        count: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(transactions)
      .where(where)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(sql`${transactions.occurredAt} DESC`)
      .limit(50),
  ]);

  return {
    key: keyValue,
    title: stats.title,
    total: stats.total,
    count: stats.count,
    average: stats.average,
    firstAt: firstAt.toISOString(),
    lastAt: lastAt.toISOString(),
    granularity,
    series: seriesRows,
    transactions: recent.map(toTransaction),
  };
}

// ── Payment methods & patterns ──────────────────────────────────────────────

export async function getPaymentMethodBreakdown(
  db: Database,
  ctx: UserCtx,
  range: DateRange,
  type: TransactionType,
): Promise<PaymentMethodRow[]> {
  return db
    .select({
      paymentMethod: transactions.paymentMethod,
      total: sumPaise(transactions.amount),
      count: sql<number>`count(*)::int`.mapWith(Number),
      percent:
        sql<number>`coalesce(round(sum(${transactions.amount}) * 100.0 / nullif(sum(sum(${transactions.amount})) OVER (), 0), 1), 0)`.mapWith(
          Number,
        ),
    })
    .from(transactions)
    .where(and(...baseWhere(ctx.userId), eq(transactions.type, type), ...rangeWhere(range)))
    .groupBy(transactions.paymentMethod)
    .orderBy(sql`2 DESC`);
}

export async function getPatterns(
  db: Database,
  ctx: UserCtx,
  range: DateRange,
  type: TransactionType,
): Promise<{ dayOfWeek: PatternRow[]; hourOfDay: PatternRow[] }> {
  const where = and(...baseWhere(ctx.userId), eq(transactions.type, type), ...rangeWhere(range));
  const fill = async (expr: SQL<number>, size: number): Promise<PatternRow[]> => {
    const sub = db
      .select({
        bucket: sql<number>`${expr}`.as('bucket'),
        total: sql<number>`sum(${transactions.amount})`.as('total'),
        n: sql<number>`count(*)`.as('n'),
      })
      .from(transactions)
      .where(where)
      .groupBy(sql`1`)
      .as('agg');
    const rows = await queryRows<{
      bucket: number;
      total: string | number;
      count: string | number;
    }>(
      db,
      sql`
      SELECT s.i AS bucket, coalesce(${sub.total}, 0)::bigint AS total, coalesce(${sub.n}, 0)::int AS count
      FROM generate_series(0, ${sql.raw(String(size - 1))}) AS s(i)
      LEFT JOIN ${sub} ON ${sub.bucket} = s.i
      ORDER BY s.i
    `,
    );
    return rows.map((r) => ({
      bucket: Number(r.bucket),
      total: Number(r.total),
      count: Number(r.count),
    }));
  };
  const [dayOfWeek, hourOfDay] = await Promise.all([
    fill(localDow(transactions.occurredAt, ctx.timezone), 7),
    fill(localHour(transactions.occurredAt, ctx.timezone), 24),
  ]);
  return { dayOfWeek, hourOfDay };
}
