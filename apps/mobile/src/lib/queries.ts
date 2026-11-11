import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  Category,
  CreateTransactionInput,
  TransactionType,
  UpdateMeInput,
  UpdateTransactionInput,
} from '@paipai/shared/schemas';
import { api, type RangeParams, type TransactionFilters } from './api';

export const qk = {
  me: ['me'] as const,
  categories: ['categories'] as const,
  transactions: (f: TransactionFilters) => ['transactions', f] as const,
  analytics: ['analytics'] as const,
};

export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: api.me, staleTime: 60_000 });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeInput) => api.updateMe(body),
    onSuccess: (me) => {
      qc.setQueryData(qk.me, me);
      void qc.invalidateQueries({ queryKey: qk.analytics });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: () => api.categories(),
    staleTime: 5 * 60_000,
  });
}

export function useCategoryMap() {
  const { data } = useCategories();
  return new Map((data ?? []).map((c) => [c.id, c]));
}

export function useInfiniteTransactions(filters: TransactionFilters, limit = 30) {
  return useInfiniteQuery({
    queryKey: qk.transactions(filters),
    queryFn: ({ pageParam, signal }) =>
      api.transactions({ ...filters, limit, ...(pageParam ? { cursor: pageParam } : {}) }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

export function useRecentTransactions(limit = 6) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: ({ signal }) => api.transactions({ limit }, signal),
  });
}

export function useSummary(p: RangeParams) {
  return useQuery({
    queryKey: [...qk.analytics, 'summary', p],
    queryFn: () => api.summary(p),
    placeholderData: keepPreviousData,
  });
}

export function useTimeseries(
  p: { granularity: 'day' | 'week' | 'month'; from: string; to: string; type?: TransactionType },
  enabled = true,
) {
  return useQuery({
    queryKey: [...qk.analytics, 'timeseries', p],
    queryFn: () => api.timeseries(p),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCategoryBreakdown(p: RangeParams) {
  return useQuery({
    queryKey: [...qk.analytics, 'categories', p],
    queryFn: () => api.categoryBreakdown(p),
    placeholderData: keepPreviousData,
  });
}

export function useItems(p: RangeParams & { limit?: number }) {
  return useQuery({
    queryKey: [...qk.analytics, 'items', p],
    queryFn: () => api.items(p),
    placeholderData: keepPreviousData,
  });
}

export function useItemDetail(title: string) {
  return useQuery({
    queryKey: [...qk.analytics, 'item', title],
    queryFn: () => api.itemDetail(title),
  });
}

export function usePaymentMethods(p: RangeParams) {
  return useQuery({
    queryKey: [...qk.analytics, 'payment-methods', p],
    queryFn: () => api.paymentMethods(p),
    placeholderData: keepPreviousData,
  });
}

export function usePatterns(p: RangeParams) {
  return useQuery({
    queryKey: [...qk.analytics, 'patterns', p],
    queryFn: () => api.patterns(p),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: qk.analytics }),
      qc.invalidateQueries({ queryKey: ['budgets'] }),
      qc.invalidateQueries({ queryKey: ['report'] }),
    ]);
}

export function useSaveTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (v: {
      id?: string;
      create?: CreateTransactionInput;
      update?: UpdateTransactionInput;
    }) => {
      if (v.id && v.update) return api.updateTransaction(v.id, v.update);
      if (!v.create) throw new Error('Nothing to save');
      return api.createTransaction(v.create);
    },
    onSuccess: () => invalidate(),
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => invalidate(),
  });
}

export function useRestoreTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (id: string) => api.restoreTransaction(id),
    onSuccess: () => invalidate(),
  });
}

export function useDuplicateTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (id: string) => api.duplicateTransaction(id),
    onSuccess: () => invalidate(),
  });
}

// ── Phase 5 ─────────────────────────────────────────────────────────────────

export function useBudgets() {
  return useQuery({ queryKey: ['budgets'], queryFn: api.budgets });
}

export function useBudgetMutations() {
  const qc = useQueryClient();
  const done = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['budgets'] }),
      qc.invalidateQueries({ queryKey: qk.me }),
    ]);
  return {
    create: useMutation({ mutationFn: api.createBudget, onSuccess: done }),
    update: useMutation({
      mutationFn: (v: { id: string; body: Parameters<typeof api.updateBudget>[1] }) =>
        api.updateBudget(v.id, v.body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: api.deleteBudget, onSuccess: done }),
  };
}

export function useRecurring() {
  return useQuery({ queryKey: ['recurring'], queryFn: api.recurring });
}

export function useRecurringMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['recurring'] });
  return {
    create: useMutation({ mutationFn: api.createRecurring, onSuccess: done }),
    update: useMutation({
      mutationFn: (v: { id: string; body: Parameters<typeof api.updateRecurring>[1] }) =>
        api.updateRecurring(v.id, v.body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: api.deleteRecurring, onSuccess: done }),
  };
}

export function useMonthlyReport(month: string) {
  return useQuery({
    queryKey: ['report', month],
    queryFn: () => api.monthlyReport(month),
    placeholderData: keepPreviousData,
  });
}

export function useUploadsEnabled() {
  return (
    useQuery({ queryKey: ['uploads-config'], queryFn: api.uploadsConfig, staleTime: 10 * 60_000 })
      .data?.enabled ?? false
  );
}

export function useAllCategories() {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () =>
      api
        .request<{ items: Category[] }>('/api/categories', { query: { includeArchived: 'true' } })
        .then((r) => r.items),
  });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['categories'] });
  return {
    create: useMutation({ mutationFn: api.createCategory, onSuccess: done }),
    update: useMutation({
      mutationFn: (v: { id: string; body: Parameters<typeof api.updateCategory>[1] }) =>
        api.updateCategory(v.id, v.body),
      onSuccess: done,
    }),
    reorder: useMutation({
      mutationFn: (ids: string[]) =>
        api.request<{ ok: true }>('/api/categories/reorder', { body: { ids } }),
      onSuccess: done,
    }),
  };
}
