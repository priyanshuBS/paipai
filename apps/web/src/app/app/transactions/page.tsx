'use client';

import { Popover } from 'radix-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { DEFAULT_TIMEZONE, dayKey, formatDayHeader } from '@paipai/shared/date';
import { formatINR, parseRupeesToPaise } from '@paipai/shared/money';
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type TransactionType,
} from '@paipai/shared/schemas';
import { PageHeader } from '@/components/app/app-shell';
import { useQuickAdd } from '@/components/app/quick-add-context';
import { TransactionRow, TransactionRowSkeleton } from '@/components/app/transaction-row';
import { CategoryIcon } from '@/components/category-icon';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, Chip, ErrorState, Input, Label, Select } from '@/components/ui/primitives';
import type { TransactionFilters } from '@/lib/api';
import { useCategories, useCategoryMap, useInfiniteTransactions, useMe } from '@/lib/queries';
import { cn } from '@/lib/utils';

const METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank', 'other'];

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

interface FilterState {
  from: string;
  to: string;
  type: '' | TransactionType;
  categoryId: string[];
  paymentMethod: PaymentMethod[];
  minAmount: string;
  maxAmount: string;
  tags: string;
  sort: NonNullable<TransactionFilters['sort']>;
}

const EMPTY: FilterState = {
  from: '',
  to: '',
  type: '',
  categoryId: [],
  paymentMethod: [],
  minAmount: '',
  maxAmount: '',
  tags: '',
  sort: 'date_desc',
};

function activeCount(f: FilterState) {
  return (
    [f.from, f.to, f.type, f.minAmount, f.maxAmount, f.tags].filter(Boolean).length +
    f.categoryId.length +
    f.paymentMethod.length
  );
}

function FiltersPanel({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const { data: categories = [] } = useCategories();
  const visible = categories.filter((c) => !c.isArchived && (!value.type || c.type === value.type));
  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="f-from">From</Label>
          <Input
            id="f-from"
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="f-to">To</Label>
          <Input
            id="f-to"
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Type</legend>
        <div className="flex gap-2">
          {(['', 'expense', 'income'] as const).map((t) => (
            <Chip
              key={t || 'all'}
              selected={value.type === t}
              onClick={() => onChange({ ...value, type: t, categoryId: [] })}
            >
              {t === '' ? 'All' : t === 'expense' ? 'Expense' : 'Income'}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Payment method</legend>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <Chip
              key={m}
              selected={value.paymentMethod.includes(m)}
              onClick={() => onChange({ ...value, paymentMethod: toggle(value.paymentMethod, m) })}
            >
              {PAYMENT_METHOD_LABELS[m]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Categories</legend>
        <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
          {visible.map((c) => {
            const on = value.categoryId.includes(c.id);
            return (
              <Chip
                key={c.id}
                selected={on}
                onClick={() => onChange({ ...value, categoryId: toggle(value.categoryId, c.id) })}
                className="pl-1.5"
              >
                <CategoryIcon icon={c.icon} color={c.color} size="sm" className="size-7" />
                {c.name}
              </Chip>
            );
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="f-min">Min ₹</Label>
          <Input
            id="f-min"
            inputMode="decimal"
            placeholder="0"
            value={value.minAmount}
            onChange={(e) => onChange({ ...value, minAmount: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="f-max">Max ₹</Label>
          <Input
            id="f-max"
            inputMode="decimal"
            placeholder="Any"
            value={value.maxAmount}
            onChange={(e) => onChange({ ...value, maxAmount: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="f-tags">Tags</Label>
        <Input
          id="f-tags"
          placeholder="trip, office"
          value={value.tags}
          onChange={(e) => onChange({ ...value, tags: e.target.value })}
        />
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const categories = useCategoryMap();
  const { openAdd } = useQuickAdd();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY);
  const debouncedQ = useDebounced(q.trim());
  const debouncedFilters = useDebounced(filters, 300);

  const apiFilters = useMemo<TransactionFilters>(() => {
    const f = debouncedFilters;
    const min = f.minAmount ? parseRupeesToPaise(f.minAmount) : null;
    const max = f.maxAmount ? parseRupeesToPaise(f.maxAmount) : null;
    return {
      ...(debouncedQ ? { q: debouncedQ } : {}),
      ...(f.from ? { from: f.from } : {}),
      ...(f.to ? { to: f.to } : {}),
      ...(f.type ? { type: f.type } : {}),
      ...(f.categoryId.length ? { categoryId: f.categoryId } : {}),
      ...(f.paymentMethod.length ? { paymentMethod: f.paymentMethod } : {}),
      ...(min !== null ? { minAmount: min } : {}),
      ...(max !== null ? { maxAmount: max } : {}),
      ...(f.tags.trim()
        ? {
            tags: f.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          }
        : {}),
      sort: f.sort,
    };
  }, [debouncedFilters, debouncedQ]);

  const query = useInfiniteTransactions(apiFilters);
  const sentinel = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage)
          void query.fetchNextPage();
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [query]);

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  const dayTotals = Object.assign({}, ...pages.map((p) => p.dayTotals)) as Record<
    string,
    { expense: number; income: number }
  >;
  const byDate = filters.sort.startsWith('date');

  // Group by day (only meaningful for date sorts)
  const groups = useMemo(() => {
    if (!byDate) return [{ key: 'all', items }];
    const out: { key: string; items: typeof items }[] = [];
    for (const t of items) {
      const key = dayKey(t.occurredAt, tz);
      const last = out.at(-1);
      if (last?.key === key) last.items.push(t);
      else out.push({ key, items: [t] });
    }
    return out;
  }, [items, tz, byDate]);

  const nFilters = activeCount(filters);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Transactions"
        action={
          <Button onClick={() => openAdd('expense')} className="hidden sm:inline-flex">
            <Plus /> Add
          </Button>
        }
      />

      <div className="sticky top-0 z-20 space-y-3 bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search title or note"
              aria-label="Search transactions"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-full pl-10"
            />
          </div>
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button
                variant="outline"
                className="h-12"
                aria-label={`Filters${nFilters ? `, ${nFilters} active` : ''}`}
              >
                <SlidersHorizontal />
                <span className="hidden sm:inline">Filters</span>
                {nFilters > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-forest text-[11px] text-white dark:bg-lime dark:text-forest">
                    {nFilters}
                  </span>
                )}
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={8}
                collisionPadding={16}
                className="z-50 max-h-[75dvh] w-[min(92vw,26rem)] overflow-y-auto rounded-[24px] bg-surface p-5 shadow-[var(--shadow-float)] ring-1 ring-border"
              >
                <FiltersPanel value={filters} onChange={setFilters} />
                <div className="mt-5 flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setFilters({ ...EMPTY, sort: filters.sort })}
                  >
                    Clear
                  </Button>
                  <Popover.Close asChild>
                    <Button className="flex-1">
                      <Check /> Done
                    </Button>
                  </Popover.Close>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <label htmlFor="sort" className="sr-only">
            Sort
          </label>
          <Select
            id="sort"
            className="h-12"
            value={filters.sort}
            onChange={(e) =>
              setFilters({ ...filters, sort: e.target.value as FilterState['sort'] })
            }
          >
            <option value="date_desc">Newest</option>
            <option value="date_asc">Oldest</option>
            <option value="amount_desc">Highest ₹</option>
            <option value="amount_asc">Lowest ₹</option>
          </Select>
        </div>
        {nFilters > 0 && (
          <button
            type="button"
            onClick={() => setFilters({ ...EMPTY, sort: filters.sort })}
            className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden /> Clear {nFilters} filter{nFilters > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="px-4 pt-2 sm:px-8" aria-live="polite" aria-busy={query.isFetching}>
        {query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : query.isLoading ? (
          <Card className="p-3">
            <ul>
              {Array.from({ length: 8 }, (_, i) => (
                <TransactionRowSkeleton key={i} />
              ))}
            </ul>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            {q || nFilters ? (
              <EmptyState
                title="No matches"
                description="Try a different search or clear some filters."
              />
            ) : (
              <EmptyState
                title="No expenses yet — add your first one!"
                description="Everything you add shows up here, grouped by day."
                action={
                  <Button onClick={() => openAdd('expense')}>
                    <Plus /> Add expense
                  </Button>
                }
              />
            )}
          </Card>
        ) : (
          <div
            className={cn(
              'space-y-4 transition-opacity',
              query.isFetching && !query.isFetchingNextPage && 'opacity-60',
            )}
          >
            {groups.map((g) => {
              const totals = dayTotals[g.key];
              return (
                <section
                  key={g.key}
                  aria-label={
                    byDate ? formatDayHeader(g.items[0]?.occurredAt ?? new Date(), tz) : 'Results'
                  }
                >
                  {byDate && (
                    <div className="flex items-baseline justify-between px-2 pb-1">
                      <h2 className="text-sm font-semibold text-muted-foreground">
                        {formatDayHeader(g.items[0]?.occurredAt ?? new Date(), tz)}
                      </h2>
                      {totals && (
                        <p className="tabular text-sm text-muted-foreground">
                          {totals.expense > 0 && (
                            <span className="font-semibold text-expense">
                              −{formatINR(totals.expense)}
                            </span>
                          )}
                          {totals.expense > 0 && totals.income > 0 && ' · '}
                          {totals.income > 0 && (
                            <span className="font-semibold text-income">
                              +{formatINR(totals.income)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  <Card className="p-2">
                    <ul className="space-y-0.5">
                      {g.items.map((t) => (
                        <TransactionRow
                          key={t.id}
                          t={t}
                          tz={tz}
                          category={t.categoryId ? categories.get(t.categoryId) : undefined}
                        />
                      ))}
                    </ul>
                  </Card>
                </section>
              );
            })}
            <div ref={sentinel} />
            {query.isFetchingNextPage && (
              <Card className="p-2">
                <ul>
                  <TransactionRowSkeleton />
                  <TransactionRowSkeleton />
                </ul>
              </Card>
            )}
            {!query.hasNextPage && items.length > 10 && (
              <p className="py-4 text-center text-sm text-muted-foreground">That's everything ✨</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
