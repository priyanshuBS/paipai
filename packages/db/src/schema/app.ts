import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps, users } from './auth';
import {
  budgetPeriodEnum,
  paymentMethodEnum,
  recurringFrequencyEnum,
  transactionTypeEnum,
} from './enums';

/** user_id NULL = system default category shared by everyone. */
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    /** Stable key for system categories (seed idempotency); NULL for user categories. */
    key: text('key').unique(),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    type: transactionTypeEnum('type').notNull(),
    isArchived: boolean('is_archived').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('categories_user_type_idx').on(t.userId, t.type, t.sortOrder),
    check('categories_system_key_chk', sql`(${t.userId} IS NULL) = (${t.key} IS NOT NULL)`),
  ],
);

export const recurringTransactions = pgTable(
  'recurring_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: transactionTypeEnum('type').notNull().default('expense'),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    title: text('title').notNull(),
    note: text('note'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    paymentMethod: paymentMethodEnum('payment_method').notNull().default('upi'),
    frequency: recurringFrequencyEnum('frequency').notNull(),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('recurring_user_idx').on(t.userId),
    index('recurring_due_idx')
      .on(t.nextRunAt)
      .where(sql`${t.isActive} = true`),
    check('recurring_amount_positive_chk', sql`${t.amount} > 0`),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: transactionTypeEnum('type').notNull().default('expense'),
    /** Integer paise, always positive; the sign comes from `type`. */
    amount: bigint('amount', { mode: 'number' }).notNull(),
    title: text('title').notNull(),
    note: text('note'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    paymentMethod: paymentMethodEnum('payment_method').notNull().default('upi'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    location: text('location'),
    receiptUrl: text('receipt_url'),
    recurringId: uuid('recurring_id').references(() => recurringTransactions.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('transactions_user_occurred_idx').on(t.userId, t.occurredAt.desc()),
    index('transactions_user_category_idx').on(t.userId, t.categoryId),
    index('transactions_user_title_idx').on(t.userId, sql`lower(${t.title})`),
    index('transactions_tags_idx').using('gin', t.tags),
    check('transactions_amount_positive_chk', sql`${t.amount} > 0`),
  ],
);

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** NULL = overall budget */
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    period: budgetPeriodEnum('period').notNull().default('monthly'),
    alertThresholdPercent: integer('alert_threshold_percent').notNull().default(80),
    /** Last period start for which a threshold alert was sent (avoid duplicate pushes). */
    lastAlertedPeriodStart: timestamp('last_alerted_period_start', { withTimezone: true }),
    /** Highest alert level already sent in that period: 0 = none, 1 = threshold, 2 = over 100%. */
    lastAlertLevel: integer('last_alert_level').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    unique('budgets_user_category_period_uq')
      .on(t.userId, t.categoryId, t.period)
      .nullsNotDistinct(),
    check('budgets_amount_positive_chk', sql`${t.amount} > 0`),
    check('budgets_threshold_chk', sql`${t.alertThresholdPercent} BETWEEN 1 AND 100`),
  ],
);

/** Expo push tokens per device (used for budget alerts). */
export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    platform: text('platform').notNull(),
    ...timestamps,
  },
  (t) => [index('push_tokens_user_idx').on(t.userId)],
);
