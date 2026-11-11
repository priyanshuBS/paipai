import { z } from 'zod';
import { amountPaiseSchema, budgetPeriodSchema, idSchema } from './common';

export const createBudgetSchema = z.object({
  /** null = overall budget */
  categoryId: idSchema.nullable().default(null),
  amount: amountPaiseSchema,
  period: budgetPeriodSchema.default('monthly'),
  alertThresholdPercent: z.number().int().min(1).max(100).default(80),
});
export type CreateBudgetInput = z.input<typeof createBudgetSchema>;

export const updateBudgetSchema = z
  .object({
    amount: amountPaiseSchema,
    alertThresholdPercent: z.number().int().min(1).max(100),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
