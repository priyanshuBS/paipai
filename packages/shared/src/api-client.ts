/**
 * Typed PaiPai API client shared by the website and the Expo app. The web
 * passes `credentials: 'include'` (httpOnly cookies); mobile passes a
 * `headers()` hook that adds the session cookie from SecureStore.
 */
import type {
  AnalyticsSummary,
  BudgetAlert,
  BudgetView,
  CreateBudgetInput,
  CreateRecurringInput,
  MonthlyReport,
  PresignUploadInput,
  PresignUploadResult,
  RecurringView,
  UpdateBudgetInput,
  UpdateRecurringInput,
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

/** Saved transaction, plus any budget alerts it triggered. */
export type SavedTransaction = Transaction & { budgetAlerts?: BudgetAlert[] };

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
      request<SavedTransaction>('/api/transactions', { body }),
    updateTransaction: (id: string, body: UpdateTransactionInput) =>
      request<SavedTransaction>(`/api/transactions/${id}`, { method: 'PATCH', body }),
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
    budgets: () => request<{ items: BudgetView[] }>('/api/budgets').then((r) => r.items),
    createBudget: (body: CreateBudgetInput) => request<BudgetView>('/api/budgets', { body }),
    updateBudget: (id: string, body: UpdateBudgetInput) =>
      request<BudgetView>(`/api/budgets/${id}`, { method: 'PATCH', body }),
    deleteBudget: (id: string) =>
      request<{ deleted: true }>(`/api/budgets/${id}`, { method: 'DELETE' }),

    recurring: () => request<{ items: RecurringView[] }>('/api/recurring').then((r) => r.items),
    createRecurring: (body: CreateRecurringInput) =>
      request<RecurringView>('/api/recurring', { body }),
    updateRecurring: (id: string, body: UpdateRecurringInput) =>
      request<RecurringView>(`/api/recurring/${id}`, { method: 'PATCH', body }),
    deleteRecurring: (id: string) =>
      request<{ deleted: true }>(`/api/recurring/${id}`, { method: 'DELETE' }),

    monthlyReport: (month: string) =>
      request<MonthlyReport>('/api/reports/monthly', { query: { month } }),
    /** URL of a CSV/PDF export (download it with the session attached). */
    exportUrl: (format: 'csv' | 'pdf', from: string, to: string) =>
      `${base}/api/export${toQueryString({ format, from, to })}`,

    uploadsConfig: () => request<{ enabled: boolean }>('/api/uploads/config'),
    presignUpload: (body: PresignUploadInput) =>
      request<PresignUploadResult>('/api/uploads/presign', { body }),

    registerPushToken: (token: string, platform: 'ios' | 'android') =>
      request<{ ok: true }>('/api/push-tokens', { body: { token, platform } }),
    removePushToken: (token: string) =>
      request<{ ok: true }>('/api/push-tokens', {
        method: 'DELETE',
        body: { token, platform: 'android' },
      }),

    patterns: (p: RangeParams) =>
      request<{ dayOfWeek: PatternRow[]; hourOfDay: PatternRow[] }>('/api/analytics/patterns', {
        query: { ...p },
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
