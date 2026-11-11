import {
  and,
  budgets,
  categories,
  eq,
  isNull,
  or,
  queryRows,
  sql,
  users,
  type Database,
} from '@paipai/db';
import { getPeriodRange, type Period } from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import type {
  BudgetAlert,
  BudgetStatus,
  BudgetView,
  CreateBudgetInput,
  UpdateBudgetInput,
  createBudgetSchema,
} from '@paipai/shared/schemas';
import type { z } from 'zod';
import { AppError, badRequest, notFound } from '../lib/errors';
import type { Notifier } from '../lib/notifier';
import type { UserCtx } from '../types';

const PERIOD: Record<BudgetView['period'], Period> = {
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};
const LEVEL = { none: 0, threshold: 1, over: 2 } as const;

export type CreateInput = z.output<typeof createBudgetSchema>;
export type { CreateBudgetInput };

function statusFor(percent: number, threshold: number): BudgetStatus {
  return percent >= 100 ? 'over' : percent >= threshold ? 'warning' : 'ok';
}

/**
 * Spent per category (and overall) in a window, in one query:
 * GROUPING SETS gives a row per category plus a grand-total row.
 */
async function spentByCategory(db: Database, userId: string, from: Date, to: Date) {
  const rows = await queryRows<{
    category_id: string | null;
    is_total: boolean;
    spent: string | number;
  }>(
    db,
    sql`
      SELECT category_id, GROUPING(category_id) = 1 AS is_total, coalesce(sum(amount), 0)::bigint AS spent
      FROM transactions
      WHERE user_id = ${userId} AND deleted_at IS NULL AND type = 'expense'
        AND occurred_at >= ${from.toISOString()}::timestamptz AND occurred_at < ${to.toISOString()}::timestamptz
      GROUP BY GROUPING SETS ((category_id), ())
    `,
  );
  let total = 0;
  const byCategory = new Map<string, number>();
  for (const r of rows) {
    if (r.is_total) total = Number(r.spent);
    else if (r.category_id) byCategory.set(r.category_id, Number(r.spent));
  }
  return { total, byCategory };
}

/** All of a user's budgets with progress for the period containing `at`. */
export async function listBudgets(
  db: Database,
  ctx: UserCtx,
  at: Date = new Date(),
): Promise<BudgetView[]> {
  const rows = await db
    .select({
      b: budgets,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(budgets)
    .leftJoin(categories, eq(categories.id, budgets.categoryId))
    .where(eq(budgets.userId, ctx.userId))
    .orderBy(sql`${budgets.categoryId} IS NOT NULL`, categories.sortOrder, budgets.createdAt);

  const periods = [...new Set(rows.map((r) => r.b.period))];
  const spentByPeriod = new Map<
    string,
    Awaited<ReturnType<typeof spentByCategory>> & { from: Date; to: Date }
  >();
  for (const p of periods) {
    const range = getPeriodRange(PERIOD[p], at, ctx.timezone);
    spentByPeriod.set(p, {
      ...(await spentByCategory(db, ctx.userId, range.from, range.to)),
      ...range,
    });
  }

  return rows.map(({ b, categoryName, categoryIcon, categoryColor }) => {
    const s = spentByPeriod.get(b.period);
    const spent = b.categoryId ? (s?.byCategory.get(b.categoryId) ?? 0) : (s?.total ?? 0);
    const percent = b.amount > 0 ? Math.round((spent / b.amount) * 1000) / 10 : 0;
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName,
      categoryIcon,
      categoryColor,
      amount: b.amount,
      period: b.period,
      alertThresholdPercent: b.alertThresholdPercent,
      spent,
      remaining: b.amount - spent,
      percent,
      status: statusFor(percent, b.alertThresholdPercent),
      periodStart: (s?.from ?? at).toISOString(),
      periodEnd: (s?.to ?? at).toISOString(),
    };
  });
}

async function assertExpenseCategory(db: Database, userId: string, categoryId: string) {
  const [c] = await db
    .select({ type: categories.type })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        or(isNull(categories.userId), eq(categories.userId, userId)),
      ),
    )
    .limit(1);
  if (!c) throw badRequest('Category not found');
  if (c.type !== 'expense') throw badRequest('Budgets can only be set on expense categories');
}

export async function createBudget(
  db: Database,
  ctx: UserCtx,
  input: CreateInput,
): Promise<BudgetView> {
  if (input.categoryId) await assertExpenseCategory(db, ctx.userId, input.categoryId);
  const [row] = await db
    .insert(budgets)
    .values({ userId: ctx.userId, ...input })
    .onConflictDoNothing()
    .returning({ id: budgets.id });
  if (!row) {
    throw new AppError(
      409,
      'BUDGET_EXISTS',
      `You already have a ${input.period} budget for ${input.categoryId ? 'this category' : 'overall spending'}`,
    );
  }
  if (!input.categoryId && input.period === 'monthly')
    await syncUserFromOverallMonthly(db, ctx.userId);
  const view = (await listBudgets(db, ctx)).find((b) => b.id === row.id);
  if (!view) throw notFound('Budget');
  return view;
}

export async function updateBudget(
  db: Database,
  ctx: UserCtx,
  id: string,
  input: UpdateBudgetInput,
): Promise<BudgetView> {
  const [row] = await db
    .update(budgets)
    // Re-arm alerts when the limit changes.
    .set({ ...input, lastAlertLevel: 0, lastAlertedPeriodStart: null })
    .where(and(eq(budgets.id, id), eq(budgets.userId, ctx.userId)))
    .returning({ id: budgets.id, categoryId: budgets.categoryId, period: budgets.period });
  if (!row) throw notFound('Budget');
  if (!row.categoryId && row.period === 'monthly') await syncUserFromOverallMonthly(db, ctx.userId);
  const view = (await listBudgets(db, ctx)).find((b) => b.id === id);
  if (!view) throw notFound('Budget');
  return view;
}

export async function deleteBudget(db: Database, ctx: UserCtx, id: string): Promise<void> {
  const res = await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, ctx.userId)))
    .returning({ id: budgets.id, categoryId: budgets.categoryId, period: budgets.period });
  if (res.length === 0) throw notFound('Budget');
  if (!res[0]?.categoryId && res[0]?.period === 'monthly')
    await syncUserFromOverallMonthly(db, ctx.userId);
}

/**
 * After an expense is saved: find budgets that just crossed their threshold or
 * 100% for the current period, record that (atomically, so each level fires
 * once per period even with concurrent saves) and notify.
 */
export async function checkBudgetAlerts(
  db: Database,
  ctx: UserCtx & { currency: string },
  notifier: Notifier | null,
  at: Date = new Date(),
): Promise<BudgetAlert[]> {
  const views = await listBudgets(db, ctx, at);
  const alerts: BudgetAlert[] = [];
  for (const v of views) {
    const level =
      v.percent >= 100
        ? LEVEL.over
        : v.percent >= v.alertThresholdPercent
          ? LEVEL.threshold
          : LEVEL.none;
    if (level === LEVEL.none) continue;
    const periodStart = new Date(v.periodStart);
    const claimed = await db
      .update(budgets)
      .set({ lastAlertLevel: level, lastAlertedPeriodStart: periodStart })
      .where(
        and(
          eq(budgets.id, v.id),
          sql`(${budgets.lastAlertedPeriodStart} IS DISTINCT FROM ${periodStart.toISOString()}::timestamptz OR ${budgets.lastAlertLevel} < ${level})`,
        ),
      )
      .returning({ id: budgets.id });
    if (claimed.length === 0) continue;

    const fmt = (p: number) => formatMoney(p, { currency: ctx.currency });
    const name = v.categoryName ? `${v.categoryName} budget` : `${v.period} budget`;
    const message =
      level === LEVEL.over
        ? `You've gone over your ${name}: ${fmt(v.spent)} of ${fmt(v.amount)}.`
        : `You've used ${Math.floor(v.percent)}% of your ${name} (${fmt(v.spent)} of ${fmt(v.amount)}).`;
    const alert: BudgetAlert = {
      budgetId: v.id,
      categoryName: v.categoryName,
      level: level === LEVEL.over ? 'over' : 'threshold',
      percent: v.percent,
      spent: v.spent,
      amount: v.amount,
      message,
    };
    alerts.push(alert);
    void notifier?.sendToUser(ctx.userId, {
      title: level === LEVEL.over ? 'Budget exceeded' : 'Budget alert',
      body: message,
      data: { type: 'budget', budgetId: v.id },
    });
  }
  return alerts;
}

/**
 * Keep `users.monthly_budget` (set during onboarding / dashboard) and the
 * overall monthly row in `budgets` in sync, in both directions.
 */
export async function syncOverallMonthlyFromUser(
  db: Database,
  userId: string,
  amount: number | null,
): Promise<void> {
  const overall = and(
    eq(budgets.userId, userId),
    isNull(budgets.categoryId),
    eq(budgets.period, 'monthly'),
  );
  if (amount === null) {
    await db.delete(budgets).where(overall);
    return;
  }
  const [existing] = await db.select({ id: budgets.id }).from(budgets).where(overall).limit(1);
  if (existing) {
    await db
      .update(budgets)
      .set({ amount, lastAlertLevel: 0, lastAlertedPeriodStart: null })
      .where(eq(budgets.id, existing.id));
  } else {
    await db
      .insert(budgets)
      .values({ userId, categoryId: null, amount, period: 'monthly' })
      .onConflictDoNothing();
  }
}

export async function syncUserFromOverallMonthly(db: Database, userId: string): Promise<void> {
  const [row] = await db
    .select({ amount: budgets.amount })
    .from(budgets)
    .where(
      and(eq(budgets.userId, userId), isNull(budgets.categoryId), eq(budgets.period, 'monthly')),
    )
    .limit(1);
  await db
    .update(users)
    .set({ monthlyBudget: row?.amount ?? null })
    .where(eq(users.id, userId));
}
