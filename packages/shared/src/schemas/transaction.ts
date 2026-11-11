import { z } from 'zod';
import {
  amountPaiseSchema,
  csvList,
  dateStringSchema,
  idSchema,
  isoDateTimeSchema,
  paymentMethodSchema,
  transactionTypeSchema,
  type PaymentMethod,
  type TransactionType,
} from './common';

const tagSchema = z.string().trim().min(1).max(30);

export const createTransactionSchema = z.object({
  /** Optional client-generated id, so offline-queued creates are idempotent. */
  id: idSchema.optional(),
  type: transactionTypeSchema.default('expense'),
  amount: amountPaiseSchema,
  title: z.string().trim().min(1, 'What was it for?').max(80),
  note: z.string().trim().max(280).nullish(),
  categoryId: idSchema.nullish(),
  paymentMethod: paymentMethodSchema.default('upi'),
  occurredAt: isoDateTimeSchema.optional(),
  tags: z.array(tagSchema).max(10).default([]),
  location: z.string().trim().max(120).nullish(),
  receiptUrl: z.url().nullish(),
});
export type CreateTransactionInput = z.input<typeof createTransactionSchema>;

export const updateTransactionSchema = z
  .object({
    type: transactionTypeSchema,
    amount: amountPaiseSchema,
    title: z.string().trim().min(1, 'What was it for?').max(80),
    note: z.string().trim().max(280).nullable(),
    categoryId: idSchema.nullable(),
    paymentMethod: paymentMethodSchema,
    occurredAt: isoDateTimeSchema,
    tags: z.array(tagSchema).max(10),
    location: z.string().trim().max(120).nullable(),
    receiptUrl: z.url().nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const transactionSorts = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'] as const;
export const transactionSortSchema = z.enum(transactionSorts);
export type TransactionSort = z.infer<typeof transactionSortSchema>;

export const listTransactionsQuerySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    type: transactionTypeSchema.optional(),
    categoryId: csvList(idSchema).optional(),
    paymentMethod: csvList(paymentMethodSchema).optional(),
    tags: csvList(tagSchema).optional(),
    minAmount: z.coerce.number().int().min(0).optional(),
    maxAmount: z.coerce.number().int().min(0).optional(),
    sort: transactionSortSchema.default('date_desc'),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: 'from must be on or before to',
    path: ['to'],
  });
export type ListTransactionsQuery = z.input<typeof listTransactionsQuerySchema>;

export const titleSuggestionsQuerySchema = z.object({
  q: z.string().trim().max(80).default(''),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  note: string | null;
  categoryId: string | null;
  paymentMethod: PaymentMethod;
  occurredAt: string;
  tags: string[];
  location: string | null;
  receiptUrl: string | null;
  recurringId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionPage {
  items: Transaction[];
  nextCursor: string | null;
}

export interface TitleSuggestion {
  title: string;
  categoryId: string | null;
  paymentMethod: PaymentMethod;
  lastAmount: number;
  count: number;
}
