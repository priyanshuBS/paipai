import { router } from 'expo-router';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_TIMEZONE, dayKey, formatDayHeader } from '@paipai/shared/date';
import { formatINR, parseRupeesToPaise } from '@paipai/shared/money';
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type Transaction,
  type TransactionType,
} from '@paipai/shared/schemas';
import { palette } from '@paipai/shared/tokens';
import { CategoryIcon } from '@/components/category-icon';
import { EmptyState } from '@/components/empty-state';
import { TransactionRow, TransactionRowSkeleton } from '@/components/transaction-row';
import { Button, Chip, ErrorState, Input, Label, Text } from '@/components/ui';
import type { TransactionFilters } from '@/lib/api';
import { useCategories, useCategoryMap, useInfiniteTransactions, useMe } from '@/lib/queries';
import { useTheme } from '@/theme/theme';

const METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank', 'other'];
type Sort = NonNullable<TransactionFilters['sort']>;

interface Filters {
  type: '' | TransactionType;
  categoryId: string[];
  paymentMethod: PaymentMethod[];
  minAmount: string;
  maxAmount: string;
  range: 'all' | 'week' | 'month' | '3months';
  sort: Sort;
}
const EMPTY: Filters = {
  type: '',
  categoryId: [],
  paymentMethod: [],
  minAmount: '',
  maxAmount: '',
  range: 'all',
  sort: 'date_desc',
};

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const toggle = <T,>(list: T[], v: T) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export default function TransactionsScreen() {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const { colors } = useTheme();
  const categories = useCategoryMap();
  const { data: allCategories = [] } = useCategories();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sheet, setSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dq = useDebounced(q.trim());

  const apiFilters = useMemo<TransactionFilters>(() => {
    const today = dayKey(new Date(), tz);
    const daysBack = { all: 0, week: 6, month: 29, '3months': 89 }[filters.range];
    const from = daysBack ? dayKey(new Date(Date.now() - daysBack * 86_400_000), tz) : undefined;
    const min = filters.minAmount ? parseRupeesToPaise(filters.minAmount) : null;
    const max = filters.maxAmount ? parseRupeesToPaise(filters.maxAmount) : null;
    return {
      ...(dq ? { q: dq } : {}),
      ...(from ? { from, to: today } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.categoryId.length ? { categoryId: filters.categoryId } : {}),
      ...(filters.paymentMethod.length ? { paymentMethod: filters.paymentMethod } : {}),
      ...(min !== null ? { minAmount: min } : {}),
      ...(max !== null ? { maxAmount: max } : {}),
      sort: filters.sort,
    };
  }, [dq, filters, tz]);

  const query = useInfiniteTransactions(apiFilters);
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const dayTotals = Object.assign(
    {},
    ...(query.data?.pages.map((p) => p.dayTotals) ?? []),
  ) as Record<string, { expense: number; income: number }>;
  const byDate = filters.sort.startsWith('date');

  const sections = useMemo(() => {
    if (!byDate) return items.length ? [{ key: 'all', title: 'Results', data: items }] : [];
    const out: { key: string; title: string; data: Transaction[] }[] = [];
    for (const t of items) {
      const key = dayKey(t.occurredAt, tz);
      const last = out.at(-1);
      if (last?.key === key) last.data.push(t);
      else out.push({ key, title: formatDayHeader(t.occurredAt, tz), data: [t] });
    }
    return out;
  }, [items, tz, byDate]);

  const nFilters =
    (filters.type ? 1 : 0) +
    filters.categoryId.length +
    filters.paymentMethod.length +
    (filters.minAmount ? 1 : 0) +
    (filters.maxAmount ? 1 : 0) +
    (filters.range !== 'all' ? 1 : 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  };

  const visibleCats = allCategories.filter(
    (c) => !c.isArchived && (!filters.type || c.type === filters.type),
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="flex-row gap-2 px-4 pb-3 pt-1">
        <View className="flex-1 justify-center">
          <View className="absolute left-4 z-10">
            <Search size={16} color={colors.textSecondary} />
          </View>
          <Input
            value={q}
            onChangeText={setQ}
            placeholder="Search title or note"
            accessibilityLabel="Search transactions"
            returnKeyType="search"
            className="rounded-full pl-10"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filters${nFilters ? `, ${nFilters} active` : ''}`}
          onPress={() => setSheet(true)}
          className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
        >
          <SlidersHorizontal size={18} color={colors.text} />
          {nFilters > 0 && (
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-forest dark:bg-lime">
              <Text weight="bold" className="text-[10px] text-white dark:text-forest">
                {nFilters}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {query.isError ? (
        <View className="px-4">
          <ErrorState onRetry={() => void query.refetch()} />
        </View>
      ) : query.isLoading ? (
        <View className="mx-4 rounded-card bg-surface py-2">
          {Array.from({ length: 8 }, (_, i) => (
            <TransactionRowSkeleton key={i} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          stickySectionHeadersEnabled
          contentContainerClassName="pb-28"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={palette.forestMid}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          renderSectionHeader={({ section }) => {
            const totals = dayTotals[section.key];
            return (
              <View className="flex-row items-baseline justify-between bg-background px-5 pb-1.5 pt-4">
                <Text weight="semibold" muted className="text-sm" accessibilityRole="header">
                  {section.title}
                </Text>
                {totals && byDate && (
                  <Text className="text-sm">
                    {totals.expense > 0 && (
                      <Text weight="semibold" className="text-sm text-expense">
                        −{formatINR(totals.expense)}
                      </Text>
                    )}
                    {totals.expense > 0 && totals.income > 0 && <Text muted> · </Text>}
                    {totals.income > 0 && (
                      <Text weight="semibold" className="text-sm text-income">
                        +{formatINR(totals.income)}
                      </Text>
                    )}
                  </Text>
                )}
              </View>
            );
          }}
          renderItem={({ item, index, section }) => (
            <View
              className={[
                'mx-4 overflow-hidden bg-surface',
                index === 0 ? 'rounded-t-card' : '',
                index === section.data.length - 1 ? 'rounded-b-card' : '',
              ].join(' ')}
            >
              <TransactionRow
                t={item}
                tz={tz}
                category={item.categoryId ? categories.get(item.categoryId) : undefined}
              />
            </View>
          )}
          ListEmptyComponent={
            q || nFilters ? (
              <EmptyState
                title="No matches"
                description="Try a different search or clear some filters."
              />
            ) : (
              <EmptyState
                title="No expenses yet — add your first one!"
                description="Everything you add shows up here, grouped by day."
                action={
                  <Button
                    title="Add expense"
                    icon={<Plus size={18} color="#fff" />}
                    onPress={() => router.push('/add-transaction')}
                  />
                }
              />
            )
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator className="py-6" color={palette.forestMid} />
            ) : !query.hasNextPage && items.length > 10 ? (
              <Text muted className="py-6 text-center text-sm">
                That&apos;s everything ✨
              </Text>
            ) : undefined
          }
        />
      )}

      {/* Filter sheet */}
      <Modal
        visible={sheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSheet(false)}
      >
        <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
          <View className="flex-row items-center justify-between px-5 py-2">
            <Text weight="bold" className="text-lg">
              Filters & sort
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              onPress={() => setSheet(false)}
              className="h-11 w-11 items-center justify-center"
            >
              <X size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerClassName="gap-6 px-5 pb-8">
            <View>
              <Label>Sort by</Label>
              <View className="flex-row flex-wrap gap-2">
                {(
                  [
                    ['date_desc', 'Newest'],
                    ['date_asc', 'Oldest'],
                    ['amount_desc', 'Highest ₹'],
                    ['amount_asc', 'Lowest ₹'],
                  ] as const
                ).map(([v, l]) => (
                  <Chip
                    key={v}
                    label={l}
                    selected={filters.sort === v}
                    onPress={() => setFilters({ ...filters, sort: v })}
                  />
                ))}
              </View>
            </View>
            <View>
              <Label>Date range</Label>
              <View className="flex-row flex-wrap gap-2">
                {(
                  [
                    ['all', 'All time'],
                    ['week', 'Last 7 days'],
                    ['month', 'Last 30 days'],
                    ['3months', 'Last 3 months'],
                  ] as const
                ).map(([v, l]) => (
                  <Chip
                    key={v}
                    label={l}
                    selected={filters.range === v}
                    onPress={() => setFilters({ ...filters, range: v })}
                  />
                ))}
              </View>
            </View>
            <View>
              <Label>Type</Label>
              <View className="flex-row gap-2">
                {(['', 'expense', 'income'] as const).map((t) => (
                  <Chip
                    key={t || 'all'}
                    label={t === '' ? 'All' : t === 'expense' ? 'Expense' : 'Income'}
                    selected={filters.type === t}
                    onPress={() => setFilters({ ...filters, type: t, categoryId: [] })}
                  />
                ))}
              </View>
            </View>
            <View>
              <Label>Payment method</Label>
              <View className="flex-row flex-wrap gap-2">
                {METHODS.map((m) => (
                  <Chip
                    key={m}
                    label={PAYMENT_METHOD_LABELS[m]}
                    selected={filters.paymentMethod.includes(m)}
                    onPress={() =>
                      setFilters({ ...filters, paymentMethod: toggle(filters.paymentMethod, m) })
                    }
                  />
                ))}
              </View>
            </View>
            <View>
              <Label>Categories</Label>
              <View className="flex-row flex-wrap gap-2">
                {visibleCats.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    left={<CategoryIcon icon={c.icon} color={c.color} size="sm" />}
                    selected={filters.categoryId.includes(c.id)}
                    onPress={() =>
                      setFilters({ ...filters, categoryId: toggle(filters.categoryId, c.id) })
                    }
                  />
                ))}
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Label>Min ₹</Label>
                <Input
                  value={filters.minAmount}
                  onChangeText={(v) => setFilters({ ...filters, minAmount: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <View className="flex-1">
                <Label>Max ₹</Label>
                <Input
                  value={filters.maxAmount}
                  onChangeText={(v) => setFilters({ ...filters, maxAmount: v })}
                  keyboardType="decimal-pad"
                  placeholder="Any"
                />
              </View>
            </View>
          </ScrollView>
          <View className="flex-row gap-2 border-t border-border px-5 pt-3">
            <Button
              title="Clear"
              variant="ghost"
              className="flex-1"
              onPress={() => setFilters(EMPTY)}
            />
            <Button title="Show results" className="flex-1" onPress={() => setSheet(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
