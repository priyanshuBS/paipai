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

export type BudgetStatus = 'ok' | 'warning' | 'over';

/** A budget with its progress in the current period (user timezone). */
export interface BudgetView {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  alertThresholdPercent: number;
  spent: number;
  remaining: number;
  percent: number;
  status: BudgetStatus;
  periodStart: string;
  periodEnd: string;
}

/** Returned with a saved expense when it pushes a budget over its threshold or 100%. */
export interface BudgetAlert {
  budgetId: string;
  categoryName: string | null;
  level: 'threshold' | 'over';
  percent: number;
  spent: number;
  amount: number;
  message: string;
}
