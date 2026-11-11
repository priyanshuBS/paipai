import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChartColumn,
  Eye,
  EyeOff,
  Plus,
  Target,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_TIMEZONE,
  formatDayHeader,
  formatMonthLabel,
  formatTime,
} from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import { palette } from '@paipai/shared/tokens';
import { EmptyState } from '@/components/empty-state';
import { CountUp } from '@/components/money';
import { TransactionRow, TransactionRowSkeleton } from '@/components/transaction-row';
import { Button, Card, ErrorState, IconPill, Skeleton, Text, cn } from '@/components/ui';
import { flushQueue, usePendingTransactions } from '@/lib/offline-queue';
import { shouldShowWelcome } from '@/lib/onboarding';
import { useCategoryMap, useMe, useRecentTransactions, useSummary } from '@/lib/queries';

const HIDE_KEY = 'paipai:hide-balance';

function firstName(name?: string) {
  return (name ?? '').trim().split(/\s+/)[0] || 'there';
}

function BudgetCard({ spent, budget }: { spent: number; budget: number | null }) {
  if (!budget) {
    return (
      <Card className="flex-row items-center gap-4">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
          <Target size={20} color={palette.forest} />
        </View>
        <View className="flex-1">
          <Text weight="semibold">Set a monthly budget</Text>
          <Text muted className="text-sm">
            We&apos;ll warn you before you overspend.
          </Text>
        </View>
        <Button title="Set" variant="soft" onPress={() => router.push('/welcome')} />
      </Card>
    );
  }
  const pct = Math.round((spent / budget) * 100);
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return (
    <Card>
      <View className="flex-row items-baseline justify-between">
        <Text weight="semibold">Monthly budget</Text>
        <Text muted className="text-sm">
          <Text weight="semibold" className="text-sm">
            {formatMoney(spent)}
          </Text>{' '}
          of {formatMoney(budget)}
        </Text>
      </View>
      <View
        className="mt-3 h-3 overflow-hidden rounded-full bg-accent-soft dark:bg-surface-muted"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.min(pct, 100) }}
        accessibilityLabel={`Budget used ${pct}%`}
      >
        <View
          className={cn(
            'h-full rounded-full',
            state === 'over'
              ? 'bg-expense'
              : state === 'warn'
                ? 'bg-warning'
                : 'bg-forest-mid dark:bg-lime',
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </View>
      <Text
        className={cn(
          'mt-2 text-sm',
          state === 'over'
            ? 'text-expense'
            : state === 'warn'
              ? 'text-warning'
              : 'text-muted-foreground',
        )}
      >
        {state === 'over'
          ? `You're ${formatMoney(spent - budget)} over budget this month.`
          : state === 'warn'
            ? `Heads up: ${pct}% used, ${formatMoney(budget - spent)} left.`
            : `${formatMoney(budget - spent)} left · ${pct}% used`}
      </Text>
    </Card>
  );
}

export default function Home() {
  const me = useMe();
  const tz = me.data?.timezone ?? DEFAULT_TIMEZONE;
  const summary = useSummary({ period: 'month', type: 'expense' });
  const recent = useRecentTransactions(6);
  const categories = useCategoryMap();
  const [hidden, setHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pending = usePendingTransactions();
  const s = summary.data;

  useEffect(() => {
    AsyncStorage.getItem(HIDE_KEY)
      .then((v) => setHidden(v === '1'))
      .catch(() => undefined);
  }, []);

  // Offer the budget step once, right after sign-up (email or Google).
  useEffect(() => {
    if (me.data) void shouldShowWelcome(me.data).then((show) => show && router.push('/welcome'));
  }, [me.data]);

  const toggleHidden = () => {
    setHidden((h) => {
      AsyncStorage.setItem(HIDE_KEY, h ? '0' : '1').catch(() => undefined);
      return !h;
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([summary.refetch(), recent.refetch(), me.refetch()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={palette.forestMid}
          />
        }
      >
        <View className="px-5 pb-4 pt-4">
          {me.data ? (
            <>
              <Text muted>Welcome back!</Text>
              <Text weight="extrabold" className="text-[28px]">
                Hi, {firstName(me.data.name)}
              </Text>
            </>
          ) : (
            <Skeleton className="h-12 w-40" />
          )}
        </View>

        {/* Balance card */}
        <View className="mx-5 overflow-hidden rounded-card bg-forest p-5">
          <View className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-lime/15" />
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-white/70">
              Spent in {formatMonthLabel(new Date(), tz)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
              onPress={toggleHidden}
              className="h-11 w-11 items-center justify-center rounded-full"
            >
              {hidden ? <EyeOff size={20} color="#fff" /> : <Eye size={20} color="#fff" />}
            </Pressable>
          </View>
          {s ? (
            <CountUp
              value={s.totalExpense}
              hidden={hidden}
              weight="semibold"
              className="text-[40px] leading-[48px] text-white"
            />
          ) : (
            <Skeleton className="h-12 w-44 bg-white/10" />
          )}
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white/10 p-3">
              <View className="flex-row items-center gap-1">
                <ArrowDownLeft size={14} color="rgba(255,255,255,0.7)" />
                <Text className="text-xs text-white/70">Income</Text>
              </View>
              <Text weight="semibold" className="mt-1 text-white">
                {s ? (hidden ? '•••••' : formatMoney(s.totalIncome)) : '—'}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-lime p-3">
              <View className="flex-row items-center gap-1">
                <ArrowUpRight size={14} color={palette.forest} />
                <Text className="text-xs text-forest/70">Net balance</Text>
              </View>
              <Text weight="semibold" className="mt-1 text-forest">
                {s ? (hidden ? '•••••' : formatMoney(s.net)) : '—'}
              </Text>
            </View>
          </View>
        </View>

        {pending.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Tries to sync now"
            onPress={() => void flushQueue().then(() => onRefresh())}
            className="mx-5 mt-3 flex-row items-center gap-2 rounded-2xl bg-warning/15 px-4 py-3"
          >
            <Text weight="semibold" className="flex-1 text-sm">
              {pending.length} {pending.length === 1 ? 'entry is' : 'entries are'} waiting to sync
            </Text>
            <Text className="text-sm text-forest-mid dark:text-lime">Sync now</Text>
          </Pressable>
        )}

        {/* Today / week / month */}
        <View className="mx-5 mt-3 flex-row gap-3">
          {[
            { label: 'Today', value: s?.today },
            { label: 'This week', value: s?.thisWeek },
            { label: 'This month', value: s?.thisMonth },
          ].map((x) => (
            <Card key={x.label} className="flex-1 p-3.5">
              <Text muted className="text-xs">
                {x.label}
              </Text>
              {x.value === undefined ? (
                <Skeleton className="mt-1 h-5 w-14" />
              ) : (
                <Text
                  weight="semibold"
                  className="mt-1 text-base"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {hidden ? '•••' : formatMoney(x.value)}
                </Text>
              )}
            </Card>
          ))}
        </View>

        {/* Quick actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5 py-5"
        >
          <IconPill
            title="Add Expense"
            icon={<Plus size={18} color={palette.lime} />}
            onPress={() => router.push('/add-transaction')}
          />
          <IconPill
            title="Add Income"
            icon={<ArrowDownLeft size={18} color={palette.lime} />}
            onPress={() =>
              router.push({ pathname: '/add-transaction', params: { type: 'income' } })
            }
          />
          <IconPill
            title="Analytics"
            icon={<ChartColumn size={18} color={palette.lime} />}
            onPress={() => router.push('/analytics')}
          />
        </ScrollView>

        <View className="mx-5 gap-4">
          <BudgetCard spent={s?.thisMonth ?? 0} budget={me.data?.monthlyBudget ?? null} />

          <Card className="px-0 pb-2 pt-4">
            <View className="flex-row items-center justify-between px-5 pb-2">
              <Text weight="semibold" className="text-base">
                Recent Activity
              </Text>
              <Link href="/transactions" asChild>
                <Pressable accessibilityRole="link" className="h-11 flex-row items-center gap-1">
                  <Text weight="semibold" className="text-sm text-forest-mid dark:text-lime">
                    See Details
                  </Text>
                  <ArrowRight size={16} color={palette.forestMid} />
                </Pressable>
              </Link>
            </View>
            {recent.isError ? (
              <View className="px-4">
                <ErrorState onRetry={() => void recent.refetch()} />
              </View>
            ) : recent.isLoading ? (
              Array.from({ length: 4 }, (_, i) => <TransactionRowSkeleton key={i} />)
            ) : recent.data?.items.length ? (
              recent.data.items.map((t) => (
                <TransactionRow
                  key={t.id}
                  t={t}
                  tz={tz}
                  category={t.categoryId ? categories.get(t.categoryId) : undefined}
                  timeLabel={`${formatDayHeader(t.occurredAt, tz)} · ${formatTime(t.occurredAt, tz)}`}
                />
              ))
            ) : (
              <EmptyState
                title="No expenses yet — add your first one!"
                description="Tap the + button below. It takes about 5 seconds."
                action={
                  <Button title="Add expense" onPress={() => router.push('/add-transaction')} />
                }
              />
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
