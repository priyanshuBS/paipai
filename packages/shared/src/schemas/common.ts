import { z } from 'zod';
import { MAX_AMOUNT_PAISE } from '../money';
import { isValidTimeZone } from '../date';

export const transactionTypes = ['expense', 'income'] as const;
export const paymentMethods = ['cash', 'upi', 'card', 'bank', 'other'] as const;
export const budgetPeriods = ['weekly', 'monthly', 'yearly'] as const;
export const recurringFrequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export const themePreferences = ['light', 'dark', 'system'] as const;
export const analyticsPeriods = ['day', 'week', 'month', 'year', 'custom'] as const;
export const granularities = ['day', 'week', 'month'] as const;

export const transactionTypeSchema = z.enum(transactionTypes);
export const paymentMethodSchema = z.enum(paymentMethods);
export const budgetPeriodSchema = z.enum(budgetPeriods);
export const recurringFrequencySchema = z.enum(recurringFrequencies);
export const themePreferenceSchema = z.enum(themePreferences);
export const analyticsPeriodSchema = z.enum(analyticsPeriods);
export const granularitySchema = z.enum(granularities);

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type BudgetPeriod = z.infer<typeof budgetPeriodSchema>;
export type RecurringFrequency = z.infer<typeof recurringFrequencySchema>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;
export type Granularity = z.infer<typeof granularitySchema>;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank: 'Bank',
  other: 'Other',
};

/** Positive integer amount in paise. */
export const amountPaiseSchema = z
  .number()
  .int('Amount must be in whole paise')
  .positive('Amount must be greater than zero')
  .max(MAX_AMOUNT_PAISE, 'Amount is too large');

export const idSchema = z.uuid();

/** ISO 8601 date-time with offset, e.g. 2024-07-08T10:30:00.000Z */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Calendar date "YYYY-MM-DD" (interpreted in the user's timezone). */
export const dateStringSchema = z.iso.date();

export const timezoneSchema = z.string().refine(isValidTimeZone, 'Invalid IANA timezone');

export const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO currency code');

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex colour like #B6E36B');

/** Comma separated list (or repeated param) in query strings -> string[] */
export const csvList = <T extends z.ZodType<string, string>>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) =>
      (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter((s) => s.length > 0),
    )
    .pipe(z.array(item));

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
