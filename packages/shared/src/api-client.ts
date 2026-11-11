/**
 * Typed PaiPai API client shared by the website and the Expo app. The web
 * passes `credentials: 'include'` (httpOnly cookies); mobile passes a
 * `headers()` hook that adds the session cookie from SecureStore.
 */
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
} from './schemas';

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

export type Query = Record<string, string | number | boolean | string[] | null | undefined>;

export function toQueryString(q?: Query): string {
  if (!q) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    const value = Array.isArray(v) ? v.join(',') : String(v);
    if (Array.isArray(v) && v.length === 0) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(value)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

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

export interface ApiClientOptions {
  baseUrl: string;
  /** 'include' on web so httpOnly cookies are sent cross-origin. */
  credentials?: 'include' | 'omit' | 'same-origin';
  /** Extra headers per request (e.g. the session cookie on mobile). */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
}

export interface RequestInitLite {
  method?: string;
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

export function createApiClient(opts: ApiClientOptions) {
  const base = opts.baseUrl.replace(/\/$/, '');

  async function request<T>(path: string, init: RequestInitLite = {}): Promise<T> {
    const extra = opts.headers ? await opts.headers() : {};
    const headers: Record<string, string> = { Accept: 'application/json', ...extra };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    let res: Response;
    try {
      res = await fetch(`${base}${path}${toQueryString(init.query)}`, {
        method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
        headers,
        ...(opts.credentials ? { credentials: opts.credentials } : {}),
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
        ...(init.signal ? { signal: init.signal } : {}),
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach PaiPai. Check your connection.');
    }
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = (
        data as { error?: { code?: string; message?: string; details?: unknown } } | null
      )?.error;
      throw new ApiError(
        res.status,
        err?.code ?? 'HTTP_ERROR',
        err?.message ?? 'Request failed',
        err?.details,
      );
    }
    return data as T;
  }

  return {
    request,
    me: () => request<Me>('/api/me'),
    updateMe: (body: UpdateMeInput) => request<Me>('/api/me', { method: 'PATCH', body }),
    deleteMe: () => request<{ deleted: true }>('/api/me', { method: 'DELETE' }),

    categories: (type?: TransactionType) =>
      request<{ items: Category[] }>('/api/categories', { query: { type } }).then((r) => r.items),
    createCategory: (body: CreateCategoryInput) => request<Category>('/api/categories', { body }),
    updateCategory: (id: string, body: UpdateCategoryInput) =>
      request<Category>(`/api/categories/${id}`, { method: 'PATCH', body }),

    transactions: (
      filters: TransactionFilters & { cursor?: string; limit?: number },
      signal?: AbortSignal,
    ) =>
      request<TransactionPage>('/api/transactions', {
        query: { ...filters },
        ...(signal ? { signal } : {}),
      }),
    transaction: (id: string) => request<Transaction>(`/api/transactions/${id}`),
    createTransaction: (body: CreateTransactionInput) =>
      request<Transaction>('/api/transactions', { body }),
    updateTransaction: (id: string, body: UpdateTransactionInput) =>
      request<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', body }),
    deleteTransaction: (id: string) =>
      request<{ deleted: true }>(`/api/transactions/${id}`, { method: 'DELETE' }),
    restoreTransaction: (id: string) =>
      request<Transaction>(`/api/transactions/${id}/restore`, { method: 'POST' }),
    duplicateTransaction: (id: string) =>
      request<Transaction>(`/api/transactions/${id}/duplicate`, { method: 'POST' }),
    titles: (q: string, signal?: AbortSignal) =>
      request<{ items: TitleSuggestion[] }>('/api/transactions/titles', {
        query: { q },
        ...(signal ? { signal } : {}),
      }).then((r) => r.items),

    summary: (p: RangeParams) =>
      request<AnalyticsSummary>('/api/analytics/summary', { query: { ...p } }),
    timeseries: (p: {
      granularity: 'day' | 'week' | 'month';
      from: string;
      to: string;
      type?: TransactionType;
    }) =>
      request<{ items: TimeseriesPoint[] }>('/api/analytics/timeseries', { query: { ...p } }).then(
        (r) => r.items,
      ),
    categoryBreakdown: (p: RangeParams & { limit?: number }) =>
      request<{ items: CategoryBreakdownRow[] }>('/api/analytics/categories', {
        query: { ...p },
      }).then((r) => r.items),
    items: (p: RangeParams & { limit?: number; q?: string }) =>
      request<{ items: ItemBreakdownRow[] }>('/api/analytics/items', { query: { ...p } }).then(
        (r) => r.items,
      ),
    itemDetail: (title: string, p?: Partial<RangeParams>) =>
      request<ItemDetail>(`/api/analytics/items/${encodeURIComponent(title)}`, {
        query: { ...p },
      }),
    paymentMethods: (p: RangeParams) =>
      request<{ items: PaymentMethodRow[] }>('/api/analytics/payment-methods', {
        query: { ...p },
      }).then((r) => r.items),
    patterns: (p: RangeParams) =>
      request<{ dayOfWeek: PatternRow[]; hourOfDay: PatternRow[] }>('/api/analytics/patterns', {
        query: { ...p },
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
