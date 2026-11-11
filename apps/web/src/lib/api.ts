import type {
  AnalyticsSummary,
  Category,
  CategoryBreakdownRow,
  CreateCategoryInput,
  CreateTransactionInput,
  ItemBreakdownRow,
  Me,
  PatternRow,
  PaymentMethodRow,
  TimeseriesPoint,
  TitleSuggestion,
  Transaction,
  TransactionType,
  UpdateCategoryInput,
  UpdateMeInput,
  UpdateTransactionInput,
} from '@paipai/shared/schemas';
import { API_URL } from './config';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | string[] | null | undefined>;

function toQuery(q?: Query): string {
  if (!q) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length) p.set(k, v.join(','));
    } else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown; query?: Query; signal?: AbortSignal } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}${toQuery(init.query)}`, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    credentials: 'include',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)
      ?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'HTTP_ERROR',
      err?.message ?? 'Request failed',
      err?.details,
    );
  }
  return data as T;
}

// ── Typed endpoints ──────────────────────────────────────────────────────────

export interface TransactionFilters {
  q?: string;
  from?: string;
  to?: string;
  type?: TransactionType;
  categoryId?: string[];
  paymentMethod?: string[];
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
  sort?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

export interface TransactionPage {
  items: Transaction[];
  nextCursor: string | null;
  dayTotals: Record<string, { expense: number; income: number }>;
}

export interface RangeParams {
  period: 'day' | 'week' | 'month' | 'year' | 'custom';
  date?: string;
  from?: string;
  to?: string;
  type?: TransactionType;
}

export interface ItemDetail {
  key: string;
  title: string;
  total: number;
  count: number;
  average: number;
  firstAt: string | null;
  lastAt: string | null;
  granularity: 'day' | 'week' | 'month';
  series: TimeseriesPoint[];
  transactions: Transaction[];
}

export const api = {
  me: () => apiFetch<Me>('/api/me'),
  updateMe: (body: UpdateMeInput) => apiFetch<Me>('/api/me', { method: 'PATCH', body }),
  deleteMe: () => apiFetch<{ deleted: true }>('/api/me', { method: 'DELETE' }),

  categories: (type?: TransactionType) =>
    apiFetch<{ items: Category[] }>('/api/categories', { query: { type } }).then((r) => r.items),
  createCategory: (body: CreateCategoryInput) => apiFetch<Category>('/api/categories', { body }),
  updateCategory: (id: string, body: UpdateCategoryInput) =>
    apiFetch<Category>(`/api/categories/${id}`, { method: 'PATCH', body }),

  transactions: (
    filters: TransactionFilters & { cursor?: string; limit?: number },
    signal?: AbortSignal,
  ) => apiFetch<TransactionPage>('/api/transactions', { query: { ...filters }, signal }),
  transaction: (id: string) => apiFetch<Transaction>(`/api/transactions/${id}`),
  createTransaction: (body: CreateTransactionInput) =>
    apiFetch<Transaction>('/api/transactions', { body }),
  updateTransaction: (id: string, body: UpdateTransactionInput) =>
    apiFetch<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', body }),
  deleteTransaction: (id: string) =>
    apiFetch<{ deleted: true }>(`/api/transactions/${id}`, { method: 'DELETE' }),
  restoreTransaction: (id: string) =>
    apiFetch<Transaction>(`/api/transactions/${id}/restore`, { method: 'POST' }),
  duplicateTransaction: (id: string) =>
    apiFetch<Transaction>(`/api/transactions/${id}/duplicate`, { method: 'POST' }),
  titles: (q: string, signal?: AbortSignal) =>
    apiFetch<{ items: TitleSuggestion[] }>('/api/transactions/titles', {
      query: { q },
      signal,
    }).then((r) => r.items),

  summary: (p: RangeParams) =>
    apiFetch<AnalyticsSummary>('/api/analytics/summary', { query: { ...p } }),
  timeseries: (p: {
    granularity: 'day' | 'week' | 'month';
    from: string;
    to: string;
    type?: TransactionType;
  }) =>
    apiFetch<{ items: TimeseriesPoint[] }>('/api/analytics/timeseries', { query: { ...p } }).then(
      (r) => r.items,
    ),
  categoryBreakdown: (p: RangeParams & { limit?: number }) =>
    apiFetch<{ items: CategoryBreakdownRow[] }>('/api/analytics/categories', {
      query: { ...p },
    }).then((r) => r.items),
  items: (p: RangeParams & { limit?: number; q?: string }) =>
    apiFetch<{ items: ItemBreakdownRow[] }>('/api/analytics/items', { query: { ...p } }).then(
      (r) => r.items,
    ),
  itemDetail: (title: string, p?: Partial<RangeParams>) =>
    apiFetch<ItemDetail>(`/api/analytics/items/${encodeURIComponent(title)}`, { query: { ...p } }),
  paymentMethods: (p: RangeParams) =>
    apiFetch<{ items: PaymentMethodRow[] }>('/api/analytics/payment-methods', {
      query: { ...p },
    }).then((r) => r.items),
  patterns: (p: RangeParams) =>
    apiFetch<{ dayOfWeek: PatternRow[]; hourOfDay: PatternRow[] }>('/api/analytics/patterns', {
      query: { ...p },
    }),
};
