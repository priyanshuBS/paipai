import { pgEnum } from 'drizzle-orm/pg-core';
import {
  budgetPeriods,
  paymentMethods,
  recurringFrequencies,
  themePreferences,
  transactionTypes,
} from '@paipai/shared/schemas';

export const transactionTypeEnum = pgEnum('transaction_type', transactionTypes);
export const paymentMethodEnum = pgEnum('payment_method', paymentMethods);
export const budgetPeriodEnum = pgEnum('budget_period', budgetPeriods);
export const recurringFrequencyEnum = pgEnum('recurring_frequency', recurringFrequencies);
export const themePreferenceEnum = pgEnum('theme_preference', themePreferences);
