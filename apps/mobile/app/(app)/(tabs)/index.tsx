import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowRight,
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
import { EmptyState } from '@/components/empty-state';
import { CountUp } from '@/components/money';
import { TransactionRow, TransactionRowSkeleton } from '@/components/transaction-row';
import { Button, Card, ErrorState, IconPill, Skeleton, Text, cn } from '@/components/ui';
import { flushQueue, usePendingTransactions } from '@/lib/offline-queue';
import { shouldShowWelcome } from '@/lib/onboarding';
import { useCategoryMap, useMe, useRecentTransactions, useSummary } from '@/lib/queries';
import { useTheme } from '@/theme/theme';

const HIDE_KEY = 'paipai:hide-balance';

function firstName(name?: string) {
  return (name ?? '').trim().split(/\s+/)[0] || 'there';
}

function greetingFor(tz: string) {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: tz }).format(
      new Date(),
    ),
  );
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function ProgressBar({ pct, tone }: { pct: number; tone: 'ok' | 'warn' | 'over' }) {
  return (
    <View
      className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.min(pct, 100) }}
      accessibilityLabel={`Budget used ${pct}%`}
    >
      <View
        className={cn(
          'h-full rounded-full',
          tone === 'over' ? 'bg-expense' : tone === 'warn' ? 'bg-warning' : 'bg-accent',
        )}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </View>
  );
}

function BudgetCard({ spent, budget }: { spent: number; budget: number | null }) {
  const { colors } = useTheme();
  if (!budget) {
    return (
      <Card className="flex-row items-center gap-3">
        <Target size={18} color={colors.textSecondary} />
        <View className="flex-1">
          <Text weight="medium" className="text-[15px]">
            Set a monthly budget
          </Text>
          <Text muted className="text-sm">
            Get a heads-up before you overspend.
          </Text>
        </View>
        <Button title="Set" variant="secondary" onPress={() => router.push('/welcome')} />
      </Card>
    );
  }
  const pct = Math.round((spent / budget) * 100);
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return (
    <Card>
      <View className="flex-row items-baseline justify-between">
        <Text weight="semibold" className="text-[15px]">
          Monthly budget
        </Text>
        <Text muted className="text-sm">
          <Text weight="medium" className="text-sm">
            {formatMoney(spent)}
          </Text>{' '}
          of {formatMoney(budget)}
        </Text>
      </View>
      <View className="mt-3">
        <ProgressBar pct={pct} tone={state} />
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
  const { colors } = useTheme();
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
            tintColor={colors.accent}
          />
        }
      >
        <View className="px-5 pb-4 pt-4">
          {me.data ? (
            <>
              <Text weight="semibold" className="text-[22px] tracking-tight">
                {greetingFor(tz)}, {firstName(me.data.name)}
              </Text>
              <Text muted className="mt-0.5 text-sm">
                Here&apos;s your month so far
              </Text>
            </>
          ) : (
            <Skeleton className="h-12 w-48" />
          )}
        </View>

        {/* This month */}
        <Card className="mx-5">
          <View className="flex-row items-center justify-between">
            <Text muted className="text-sm">
              Spent in {formatMonthLabel(new Date(), tz)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
              onPress={toggleHidden}
              hitSlop={8}
              className="-mr-2 h-9 w-9 items-center justify-center rounded-lg"
            >
              {hidden ? (
                <EyeOff size={18} color={colors.textSecondary} />
              ) : (
                <Eye size={18} color={colors.textSecondary} />
              )}
            </Pressable>
          </View>
          {s ? (
            <CountUp
              value={s.totalExpense}
              hidden={hidden}
              weight="semibold"
              className="text-[34px] leading-[42px] tracking-tight"
            />
          ) : (
            <Skeleton className="mt-1 h-10 w-40" />
          )}
          <View className="mt-4 flex-row border-t border-border pt-3.5">
            <View className="flex-1">
              <Text muted className="text-xs">
                Income
              </Text>
              <Text weight="medium" className="mt-0.5 text-[15px] text-income">
                {s ? (hidden ? '••••' : formatMoney(s.totalIncome)) : '—'}
              </Text>
            </View>
            <View className="flex-1">
              <Text muted className="text-xs">
                Net balance
              </Text>
              <Text weight="medium" className="mt-0.5 text-[15px]">
                {s ? (hidden ? '••••' : formatMoney(s.net)) : '—'}
              </Text>
            </View>
          </View>
        </Card>

        {pending.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Tries to sync now"
            onPress={() => void flushQueue().then(() => onRefresh())}
            className="mx-5 mt-3 flex-row items-center gap-2 rounded-xl border border-border border-l-2 border-l-warning bg-surface px-4 py-3"
          >
            <Text weight="medium" className="flex-1 text-sm">
              {pending.length} {pending.length === 1 ? 'entry is' : 'entries are'} waiting to sync
            </Text>
            <Text weight="medium" className="text-sm text-accent">
              Sync now
            </Text>
          </Pressable>
        )}

        {/* Today / week / month */}
        <Card className="mx-5 mt-3 flex-row p-0">
          {[
            { label: 'Today', value: s?.today },
            { label: 'This week', value: s?.thisWeek },
            { label: 'This month', value: s?.thisMonth },
          ].map((x, i) => (
            <View
              key={x.label}
              className={cn('flex-1 px-3.5 py-3', i > 0 && 'border-l border-border')}
            >
              <Text muted className="text-xs">
                {x.label}
              </Text>
              {x.value === undefined ? (
                <Skeleton className="mt-1 h-5 w-14" />
              ) : (
                <Text
                  weight="medium"
                  className="mt-0.5 text-[15px]"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {hidden ? '•••' : formatMoney(x.value)}
                </Text>
              )}
            </View>
          ))}
        </Card>

        {/* Quick actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5 py-4"
        >
          <IconPill
            title="Add expense"
            icon={<Plus size={16} color={colors.textSecondary} />}
            onPress={() => router.push('/add-transaction')}
          />
          <IconPill
            title="Add income"
            icon={<ArrowDownLeft size={16} color={colors.textSecondary} />}
            onPress={() =>
              router.push({ pathname: '/add-transaction', params: { type: 'income' } })
            }
          />
          <IconPill
            title="Analytics"
            icon={<ChartColumn size={16} color={colors.textSecondary} />}
            onPress={() => router.push('/analytics')}
          />
        </ScrollView>

        <View className="mx-5 gap-3">
          <BudgetCard spent={s?.thisMonth ?? 0} budget={me.data?.monthlyBudget ?? null} />

          <Card className="px-0 pb-1 pt-3">
            <View className="flex-row items-center justify-between px-4 pb-1">
              <Text weight="semibold" className="text-[15px]">
                Recent activity
              </Text>
              <Link href="/transactions" asChild>
                <Pressable accessibilityRole="link" className="h-10 flex-row items-center gap-1">
                  <Text weight="medium" className="text-sm text-accent">
                    View all
                  </Text>
                  <ArrowRight size={14} color={colors.accent} />
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
                title="No expenses yet"
                description="Tap + below to add your first one. It takes about five seconds."
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
