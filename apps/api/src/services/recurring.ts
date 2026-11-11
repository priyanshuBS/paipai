import {
  and,
  asc,
  eq,
  lte,
  recurringTransactions,
  transactions,
  users,
  type Database,
  type RecurringRow,
} from '@paipai/db';
import { nextOccurrence, occurrencesBetween } from '@paipai/shared/recurrence';
import type {
  RecurringView,
  UpdateRecurringInput,
  createRecurringSchema,
} from '@paipai/shared/schemas';
import type { z } from 'zod';
import { AppError, notFound } from '../lib/errors';
import { logger } from '../lib/logger';
import type { UserCtx } from '../types';
import { assertUsableCategory } from './categories';

type CreateInput = z.output<typeof createRecurringSchema>;

/** Never create more than this many catch-up entries per rule in one run. */
const MAX_CATCH_UP = 60;

export function toRecurring(r: RecurringRow): RecurringView {
  return {
    id: r.id,
    type: r.type,
    amount: r.amount,
    title: r.title,
    note: r.note,
    categoryId: r.categoryId,
    paymentMethod: r.paymentMethod,
    frequency: r.frequency,
    startAt: r.startAt.toISOString(),
    nextRunAt: r.nextRunAt.toISOString(),
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    endAt: r.endAt?.toISOString() ?? null,
    isActive: r.isActive,
  };
}

export async function listRecurring(db: Database, ctx: UserCtx): Promise<RecurringView[]> {
  const rows = await db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.userId, ctx.userId))
    .orderBy(asc(recurringTransactions.isActive), asc(recurringTransactions.nextRunAt));
  // Active first
  return rows.sort((a, b) => Number(b.isActive) - Number(a.isActive)).map(toRecurring);
}

export async function createRecurring(
  db: Database,
  ctx: UserCtx,
  input: CreateInput,
): Promise<RecurringView> {
  if (input.categoryId) await assertUsableCategory(db, ctx.userId, input.categoryId, input.type);
  const startAt = new Date(input.startAt);
  const endAt = input.endAt ? new Date(input.endAt) : null;
  if (endAt && endAt <= startAt)
    throw new AppError(400, 'VALIDATION_ERROR', 'End date must be after the start date');
  const [row] = await db
    .insert(recurringTransactions)
    .values({
      userId: ctx.userId,
      type: input.type,
      amount: input.amount,
      title: input.title,
      note: input.note ?? null,
      categoryId: input.categoryId ?? null,
      paymentMethod: input.paymentMethod,
      frequency: input.frequency,
      startAt,
      nextRunAt: startAt,
      endAt,
    })
    .returning();
  if (!row) throw new AppError(500, 'INTERNAL_ERROR', 'Could not save the recurring transaction');
  return toRecurring(row);
}

export async function updateRecurring(
  db: Database,
  ctx: UserCtx,
  id: string,
  input: UpdateRecurringInput,
): Promise<RecurringView> {
  const [current] = await db
    .select()
    .from(recurringTransactions)
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, ctx.userId)))
    .limit(1);
  if (!current) throw notFound('Recurring transaction');
  const type = input.type ?? current.type;
  const categoryId = input.categoryId !== undefined ? input.categoryId : current.categoryId;
  if (categoryId && (input.categoryId !== undefined || input.type !== undefined)) {
    await assertUsableCategory(db, ctx.userId, categoryId, type);
  }
  const { nextRunAt, endAt, frequency, isActive, ...rest } = input;
  const patch: Partial<typeof recurringTransactions.$inferInsert> = { ...rest };
  if (endAt !== undefined) patch.endAt = endAt ? new Date(endAt) : null;
  if (isActive !== undefined) patch.isActive = isActive;
  if (frequency !== undefined) patch.frequency = frequency;
  if (nextRunAt) patch.nextRunAt = new Date(nextRunAt);
  // Changing the frequency or resuming re-plans the next run from now.
  if (
    (frequency !== undefined && frequency !== current.frequency) ||
    (isActive === true && !current.isActive)
  ) {
    patch.nextRunAt = nextOccurrence(
      current.startAt,
      frequency ?? current.frequency,
      new Date(Date.now() - 1),
      ctx.timezone,
    );
  }
  const [row] = await db
    .update(recurringTransactions)
    .set(patch)
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, ctx.userId)))
    .returning();
  if (!row) throw notFound('Recurring transaction');
  return toRecurring(row);
}

export async function deleteRecurring(db: Database, ctx: UserCtx, id: string): Promise<void> {
  const res = await db
    .delete(recurringTransactions)
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, ctx.userId)))
    .returning({ id: recurringTransactions.id });
  if (res.length === 0) throw notFound('Recurring transaction');
}

/**
 * Create every due transaction (including missed runs, capped) and advance
 * each rule. Rows are locked with FOR UPDATE SKIP LOCKED inside a database
 * transaction, so concurrent runners (multiple instances, cron + timer) never
 * create the same entry twice.
 */
export async function runDueRecurring(
  db: Database,
  now: Date = new Date(),
  opts: { batchSize?: number; onCreated?: (userId: string, count: number) => void } = {},
): Promise<{ rules: number; created: number }> {
  const batchSize = opts.batchSize ?? 100;
  let rules = 0;
  let created = 0;

  for (;;) {
    const processed = await db.transaction(async (tx) => {
      const due = await tx
        .select({ r: recurringTransactions, timezone: users.timezone })
        .from(recurringTransactions)
        .innerJoin(users, eq(users.id, recurringTransactions.userId))
        .where(
          and(eq(recurringTransactions.isActive, true), lte(recurringTransactions.nextRunAt, now)),
        )
        .orderBy(asc(recurringTransactions.nextRunAt))
        .limit(batchSize)
        .for('update', { of: recurringTransactions, skipLocked: true });

      for (const { r, timezone } of due) {
        const tz = timezone || 'Asia/Kolkata';
        const runs = [
          r.nextRunAt,
          ...occurrencesBetween(r.startAt, r.frequency, r.nextRunAt, now, tz, MAX_CATCH_UP),
        ]
          .filter(
            (d) => d.getTime() <= now.getTime() && (!r.endAt || d.getTime() <= r.endAt.getTime()),
          )
          .slice(-MAX_CATCH_UP);
        if (runs.length) {
          await tx.insert(transactions).values(
            runs.map((occurredAt) => ({
              userId: r.userId,
              type: r.type,
              amount: r.amount,
              title: r.title,
              note: r.note,
              categoryId: r.categoryId,
              paymentMethod: r.paymentMethod,
              occurredAt,
              recurringId: r.id,
            })),
          );
        }
        const last = runs.at(-1) ?? r.nextRunAt;
        const next = nextOccurrence(r.startAt, r.frequency, last, tz);
        const ended = r.endAt !== null && next.getTime() > r.endAt.getTime();
        await tx
          .update(recurringTransactions)
          .set({ nextRunAt: next, lastRunAt: now, isActive: !ended })
          .where(eq(recurringTransactions.id, r.id));
        created += runs.length;
        if (runs.length) opts.onCreated?.(r.userId, runs.length);
      }
      return due.length;
    });
    rules += processed;
    if (processed < batchSize) break;
  }

  if (created) logger.info('recurring.run', { rules, created });
  return { rules, created };
}
