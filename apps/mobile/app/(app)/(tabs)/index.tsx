import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowRight,
  ChartColumn,
  Eye,
  EyeOff,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_TIMEZONE,
  dayKey,
  formatDayHeader,
  formatMonthLabel,
  formatTime,
  monthKey,
} from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import { chartColorFor } from '@paipai/shared/tokens';
import { CategoryIcon } from '@/components/category-icon';
import { Sparkline } from '@/components/charts/sparkline';
import { EmptyState } from '@/components/empty-state';
import { CountUp } from '@/components/money';
import { TransactionRow, TransactionRowSkeleton } from '@/components/transaction-row';
import { Button, Card, ErrorState, IconPill, Skeleton, Text, cn } from '@/components/ui';
import { flushQueue, usePendingTransactions } from '@/lib/offline-queue';
import { shouldShowWelcome } from '@/lib/onboarding';
import {
  useCategoryBreakdown,
  useCategoryMap,
  useMe,
  useRecentTransactions,
  useSummary,
  useTimeseries,
} from '@/lib/queries';
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

function SectionTitle({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  const { colors } = useTheme();
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text weight="semibold" className="text-[15px]">
        {title}
      </Text>
      {href && cta && (
        <Link href={href as never} asChild>
          <Pressable accessibilityRole="link" className="h-9 flex-row items-center gap-1">
            <Text weight="medium" className="text-sm text-accent">
              {cta}
            </Text>
            <ArrowRight size={14} color={colors.accent} />
          </Pressable>
        </Link>
      )}
    </View>
  );
}

/** The midnight ledger card: this month's spend, its trend and key numbers. */
function HeroCard({ tz, hidden, onToggle }: { tz: string; hidden: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  const summary = useSummary({ period: 'month', type: 'expense' });
  const now = new Date();
  const series = useTimeseries({
    granularity: 'day',
    from: `${monthKey(now, tz)}-01`,
    to: dayKey(now, tz),
    type: 'expense',
  });
  const s = summary.data;
  const values = (series.data ?? []).map((p) => p.total);
  const change = s?.changePercent ?? null;
  const less = change !== null && change <= 0;

  return (
    <View
      className="mx-5 overflow-hidden rounded-[24px] bg-hero p-5"
      style={{
        shadowColor: '#0B1020',
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      }}
    >
      {/* Saffron glow in the corner */}
      <View
        pointerEvents="none"
        className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-brand"
        style={{ opacity: 0.16 }}
      />
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-hero-muted">Spent in {formatMonthLabel(now, tz)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
          onPress={onToggle}
          hitSlop={8}
          className="-mr-2 h-9 w-9 items-center justify-center rounded-full"
        >
          {hidden ? (
            <EyeOff size={18} color={colors.heroMuted} />
          ) : (
            <Eye size={18} color={colors.heroMuted} />
          )}
        </Pressable>
      </View>
      {s ? (
        <CountUp
          value={s.totalExpense}
          hidden={hidden}
          weight="semibold"
          className="text-[40px] leading-[48px] tracking-tight text-hero-foreground"
        />
      ) : (
        <Skeleton className="mt-1 h-11 w-44 bg-hero-surface" />
      )}
      {change !== null && (
        <View
          className={cn(
            'mt-2 flex-row items-center gap-1 self-start rounded-full px-2.5 py-1',
            less ? 'bg-emerald-400/15' : 'bg-rose-400/15',
          )}
        >
          {less ? (
            <TrendingDown size={13} color="#6EE7B7" />
          ) : (
            <TrendingUp size={13} color="#FDA4AF" />
          )}
          <Text
            weight="medium"
            className={cn('text-xs', less ? 'text-emerald-300' : 'text-rose-300')}
          >
            {Math.abs(change)}% {less ? 'less' : 'more'} than last month
          </Text>
        </View>
      )}

      <View className="mt-4">
        {values.length > 1 ? (
          <Sparkline
            values={values}
            color={colors.brand}
            ring={colors.hero}
            height={88}
            label="Daily spending this month"
          />
        ) : (
          <View className="h-[88px] justify-end">
            <View className="h-px bg-hero-border" />
          </View>
        )}
      </View>

      <View className="mt-4 flex-row border-t border-hero-border pt-4">
        {[
          { label: 'Income', value: s?.totalIncome, cls: 'text-emerald-300' },
          { label: 'Net balance', value: s?.net, cls: 'text-hero-foreground' },
          { label: 'Today', value: s?.today, cls: 'text-hero-foreground' },
        ].map((x) => (
          <View key={x.label} className="flex-1">
            <Text className="text-xs text-hero-muted">{x.label}</Text>
            <Text
              weight="medium"
              className={cn('mt-0.5 text-[15px]', x.cls)}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {x.value === undefined ? '—' : hidden ? '••••' : formatMoney(x.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WhereItWent() {
  const { dark } = useTheme();
  const { data, isLoading } = useCategoryBreakdown({ period: 'month', type: 'expense' });
  const rows = (data ?? []).slice(0, 4);
  return (
    <Card>
      <SectionTitle title="Where it went" href="/analytics" cta="Analytics" />
      {isLoading ? (
        <View className="gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </View>
      ) : rows.length === 0 ? (
        <Text muted className="py-4 text-center text-sm">
          Your top categories will show up here.
        </Text>
      ) : (
        <View className="gap-4">
          {rows.map((c) => (
            <View key={c.categoryId ?? 'none'} className="flex-row items-center gap-3">
              <CategoryIcon icon={c.icon} color={c.color} size="sm" />
              <View className="flex-1">
                <View className="flex-row items-baseline justify-between">
                  <Text className="flex-1 text-sm" numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text weight="medium" className="text-sm">
                    {formatMoney(c.total)}
                  </Text>
                </View>
                <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(c.percent, 2)}%`,
                      backgroundColor: chartColorFor(c.color, dark ? 'dark' : 'light'),
                    }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function BudgetCard({ spent, budget }: { spent: number; budget: number | null }) {
  if (!budget) {
    return (
      <Card>
        <SectionTitle title="Monthly budget" />
        <Text muted className="text-sm">
          Set a budget and PaiPai warns you at 80% and again at 100%.
        </Text>
        <Button
          title="Set a budget"
          variant="secondary"
          className="mt-4 self-start"
          onPress={() => router.push('/welcome')}
        />
      </Card>
    );
  }
  const pct = Math.round((spent / budget) * 100);
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return (
    <Card>
      <SectionTitle title="Monthly budget" href="/budgets" cta="Budgets" />
      <View className="flex-row items-baseline justify-between">
        <Text weight="semibold" className="text-[22px] tracking-tight">
          {pct}%
        </Text>
        <Text muted className="text-sm">
          <Text weight="medium" className="text-sm">
            {formatMoney(spent)}
          </Text>{' '}
          of {formatMoney(budget)}
        </Text>
      </View>
      <View
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.min(pct, 100) }}
        accessibilityLabel={`Budget used ${pct}%`}
      >
        <View
          className={cn(
            'h-full rounded-full',
            state === 'over' ? 'bg-expense' : state === 'warn' ? 'bg-warning' : 'bg-brand',
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
            : `${formatMoney(budget - spent)} left this month`}
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
        contentContainerClassName="pb-10"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.brand}
          />
        }
      >
        <View className="px-5 pb-5 pt-4">
          {me.data ? (
            <>
              <Text muted className="text-sm">
                {greetingFor(tz)}
              </Text>
              <Text weight="display" className="mt-0.5 text-[34px] leading-[40px]">
                {firstName(me.data.name)}
              </Text>
            </>
          ) : (
            <Skeleton className="h-14 w-48" />
          )}
        </View>

        <HeroCard tz={tz} hidden={hidden} onToggle={toggleHidden} />

        {pending.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Tries to sync now"
            onPress={() => void flushQueue().then(() => onRefresh())}
            className="mx-5 mt-3 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <View className="h-2 w-2 rounded-full bg-warning" />
            <Text weight="medium" className="flex-1 text-sm">
              {pending.length} {pending.length === 1 ? 'entry is' : 'entries are'} waiting to sync
            </Text>
            <Text weight="medium" className="text-sm text-accent">
              Sync now
            </Text>
          </Pressable>
        )}

        {/* Quick actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5 py-5"
        >
          <IconPill
            title="Add expense"
            icon={<Plus size={16} color={colors.accent} />}
            onPress={() => router.push('/add-transaction')}
          />
          <IconPill
            title="Add income"
            icon={<ArrowDownLeft size={16} color={colors.income} />}
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

        <View className="mx-5 gap-4">
          <WhereItWent />
          <BudgetCard spent={s?.thisMonth ?? 0} budget={me.data?.monthlyBudget ?? null} />

          <Card className="px-0 pb-1 pt-4">
            <View className="px-4">
              <SectionTitle title="Recent activity" href="/transactions" cta="View all" />
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
