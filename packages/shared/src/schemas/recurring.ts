import { z } from 'zod';
import {
  amountPaiseSchema,
  idSchema,
  isoDateTimeSchema,
  paymentMethodSchema,
  recurringFrequencySchema,
  transactionTypeSchema,
} from './common';

export const createRecurringSchema = z.object({
  type: transactionTypeSchema.default('expense'),
  amount: amountPaiseSchema,
  title: z.string().trim().min(1).max(80),
  note: z.string().trim().max(280).nullish(),
  categoryId: idSchema.nullish(),
  paymentMethod: paymentMethodSchema.default('upi'),
  frequency: recurringFrequencySchema,
  /** First occurrence. */
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema.nullish(),
});
export type CreateRecurringInput = z.input<typeof createRecurringSchema>;

export const updateRecurringSchema = z
  .object({
    type: transactionTypeSchema,
    amount: amountPaiseSchema,
    title: z.string().trim().min(1).max(80),
    note: z.string().trim().max(280).nullable(),
    categoryId: idSchema.nullable(),
    paymentMethod: paymentMethodSchema,
    frequency: recurringFrequencySchema,
    endAt: isoDateTimeSchema.nullable(),
    isActive: z.boolean(),
    nextRunAt: isoDateTimeSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;

export interface RecurringView {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  title: string;
  note: string | null;
  categoryId: string | null;
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank' | 'other';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startAt: string;
  nextRunAt: string;
  lastRunAt: string | null;
  endAt: string | null;
  isActive: boolean;
}
