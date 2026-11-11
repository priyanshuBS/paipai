import { z } from 'zod';
import { RECEIPT_MAX_BYTES, UPLOAD_CONTENT_TYPES } from '../settings';
import type {
  AnalyticsSummary,
  CategoryBreakdownRow,
  ItemBreakdownRow,
  TimeseriesPoint,
} from './analytics';
import type { BudgetView } from './budget';

export const pushTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(10)
    .max(200)
    .regex(/^(Expo|Exponent)PushToken\[.+\]$/, 'Invalid Expo push token'),
  platform: z.enum(['ios', 'android']),
});

export const presignUploadSchema = z.object({
  kind: z.enum(['receipt', 'avatar']),
  contentType: z.enum(UPLOAD_CONTENT_TYPES),
  size: z.number().int().positive().max(RECEIPT_MAX_BYTES, 'File is larger than 5 MB'),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export interface PresignUploadResult {
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
}

export const exportQuerySchema = z
  .object({
    format: z.enum(['csv', 'pdf']).default('csv'),
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine((v) => v.from <= v.to, { message: 'from must be on or before to', path: ['to'] });

export const monthlyReportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM'),
});

export interface MonthlyReport {
  month: string;
  label: string;
  summary: AnalyticsSummary;
  daily: TimeseriesPoint[];
  categories: CategoryBreakdownRow[];
  topItems: ItemBreakdownRow[];
  budgets: BudgetView[];
  biggestExpense: { title: string; amount: number; occurredAt: string } | null;
  averagePerDay: number;
}
