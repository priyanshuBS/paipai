import { relations } from 'drizzle-orm';
import { accounts, sessions, users } from './auth';
import { budgets, categories, pushTokens, recurringTransactions, transactions } from './app';

export * from './enums';
export * from './auth';
export * from './app';

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  transactions: many(transactions),
  categories: many(categories),
  budgets: many(budgets),
  recurring: many(recurringTransactions),
  pushTokens: many(pushTokens),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  recurring: one(recurringTransactions, {
    fields: [transactions.recurringId],
    references: [recurringTransactions.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
  category: one(categories, { fields: [budgets.categoryId], references: [categories.id] }),
}));

export const recurringRelations = relations(recurringTransactions, ({ one, many }) => ({
  user: one(users, { fields: [recurringTransactions.userId], references: [users.id] }),
  category: one(categories, {
    fields: [recurringTransactions.categoryId],
    references: [categories.id],
  }),
  transactions: many(transactions),
}));

export type User = typeof users.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
export type BudgetRow = typeof budgets.$inferSelect;
export type RecurringRow = typeof recurringTransactions.$inferSelect;
