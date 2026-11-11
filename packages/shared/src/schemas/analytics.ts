import { z } from 'zod';
import {
  analyticsPeriodSchema,
  dateStringSchema,
  granularitySchema,
  transactionTypeSchema,
} from './common';

/** Shared range query: a named period anchored at `date`, or a custom from/to. */
export const rangeQuerySchema = z
  .object({
    period: analyticsPeriodSchema.default('month'),
    /** Anchor date for named periods (defaults to today in the user's timezone). */
    date: dateStringSchema.optional(),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    type: transactionTypeSchema.default('expense'),
  })
  .refine((v) => v.period !== 'custom' || (v.from !== undefined && v.to !== undefined), {
    message: 'from and to are required for a custom period',
    path: ['from'],
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: 'from must be on or before to',
    path: ['to'],
  });
export type RangeQuery = z.input<typeof rangeQuerySchema>;

export const timeseriesQuerySchema = z
  .object({
    granularity: granularitySchema.default('day'),
    from: dateStringSchema,
    to: dateStringSchema,
    type: transactionTypeSchema.default('expense'),
  })
  .refine((v) => v.from <= v.to, { message: 'from must be on or before to', path: ['to'] });
export type TimeseriesQuery = z.input<typeof timeseriesQuerySchema>;

export interface AnalyticsSummary {
  range: { from: string; to: string };
  totalExpense: number;
  totalIncome: number;
  net: number;
  count: number;
  previousTotal: number;
  /** % change of the selected type vs the previous period; null if no previous data. */
  changePercent: number | null;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface TimeseriesPoint {
  /** Bucket start as "YYYY-MM-DD" in the user's timezone. */
  bucket: string;
  total: number;
  count: number;
}

export interface CategoryBreakdownRow {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
  percent: number;
}

export interface ItemBreakdownRow {
  key: string;
  title: string;
  total: number;
  count: number;
  average: number;
  lastAt: string;
  categoryId: string | null;
}

export interface PaymentMethodRow {
  paymentMethod: string;
  total: number;
  count: number;
  percent: number;
}

export interface PatternRow {
  /** Day of week (0 = Monday ... 6 = Sunday) or hour of day (0-23). */
  bucket: number;
  total: number;
  count: number;
}
