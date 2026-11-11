import { and, desc, eq, gte, isNull, lt, transactions, type Database } from '@paipai/db';
import {
  dayKey,
  formatMonthLabel,
  getPeriodRange,
  getPreviousPeriodRange,
  parseDateInTz,
} from '@paipai/shared/date';
import type { MonthlyReport } from '@paipai/shared/schemas';
import type { UserCtx } from '../types';
import { getCategoryBreakdown, getItemBreakdown, getSummary, getTimeseries } from './analytics';
import { listBudgets } from './budgets';

/** Everything for the "Monthly summary" screen, aggregated in SQL. */
export async function monthlyReport(
  db: Database,
  ctx: UserCtx,
  month: string,
  now: Date = new Date(),
): Promise<MonthlyReport> {
  const anchor = parseDateInTz(`${month}-01`, ctx.timezone);
  const range = getPeriodRange('month', anchor, ctx.timezone);
  const previous = getPreviousPeriodRange('month', range, ctx.timezone);
  // A summary "as of" the end of the month (or now, for the current month).
  const asOf = new Date(Math.min(now.getTime(), range.to.getTime() - 1));

  const [summary, daily, categories, topItems, budgets, biggest] = await Promise.all([
    getSummary(db, ctx, { period: 'month', range, previous }, 'expense', asOf),
    getTimeseries(db, ctx, range, 'day', 'expense'),
    getCategoryBreakdown(db, ctx, range, 'expense'),
    getItemBreakdown(db, ctx, range, 'expense', { limit: 5 }),
    listBudgets(db, ctx, asOf),
    db
      .select({
        title: transactions.title,
        amount: transactions.amount,
        occurredAt: transactions.occurredAt,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, ctx.userId),
          isNull(transactions.deletedAt),
          eq(transactions.type, 'expense'),
          gte(transactions.occurredAt, range.from),
          lt(transactions.occurredAt, range.to),
        ),
      )
      .orderBy(desc(transactions.amount))
      .limit(1),
  ]);

  const daysInMonth = Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000);
  const isCurrent = now >= range.from && now < range.to;
  const daysCounted = isCurrent ? Number(dayKey(now, ctx.timezone).slice(8, 10)) : daysInMonth;
  const top = biggest[0];

  return {
    month,
    label: formatMonthLabel(anchor, ctx.timezone),
    summary,
    daily,
    categories,
    topItems,
    budgets: budgets.filter((b) => b.period === 'monthly'),
    biggestExpense: top
      ? { title: top.title, amount: top.amount, occurredAt: top.occurredAt.toISOString() }
      : null,
    averagePerDay: daysCounted > 0 ? Math.round(summary.totalExpense / daysCounted) : 0,
  };
}
