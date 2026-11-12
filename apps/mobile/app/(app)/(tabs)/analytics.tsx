import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronRight as Go } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_TIMEZONE,
  WEEKDAY_INITIALS,
  dayKey,
  formatDate,
  formatMonthLabel,
  getPeriodRange,
  parseDateInTz,
  shiftDateString,
  type Period,
} from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type TransactionType,
} from '@paipai/shared/schemas';
import { chartColorFor, chartPalette, palette } from '@paipai/shared/tokens';
import { CategoryIcon } from '@/components/category-icon';
import { AreaChart, BarChart, Donut, ShareBars, type ChartPoint } from '@/components/charts/charts';
import { EmptyState } from '@/components/empty-state';
import { CountUp } from '@/components/money';
import { Card, ErrorState, Segmented, Skeleton, Text, cn } from '@/components/ui';
import type { RangeParams } from '@/lib/api';
import {
  useCategoryBreakdown,
  useItems,
  useMe,
  usePaymentMethods,
  usePatterns,
  useSummary,
  useTimeseries,
} from '@/lib/queries';
import { useTheme } from '@/theme/theme';

type UiPeriod = Period | 'custom';
const PREV: Record<UiPeriod, string> = {
  day: 'yesterday',
  week: 'last week',
  month: 'last month',
  year: 'last year',
  custom: 'previous period',
};

function rangeStrings(period: Period, anchor: string, tz: string) {
  const r = getPeriodRange(period, parseDateInTz(anchor, tz), tz);
  return { from: dayKey(r.from, tz), to: dayKey(new Date(r.to.getTime() - 1), tz) };
}
const shortDay = (key: string, tz: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: tz }).format(
    parseDateInTz(key, tz),
  );
const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;

function Section({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Card className="mx-4">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1">
          <Text weight="semibold" className="text-base" accessibilityRole="header">
            {title}
          </Text>
          {subtitle && (
            <Text muted className="text-sm">
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
      {children}
    </Card>
  );
}

export default function AnalyticsScreen() {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const { colors, dark } = useTheme();
  const today = dayKey(new Date(), tz);

  const [period, setPeriod] = useState<UiPeriod>('month');
  const [anchor, setAnchor] = useState(today);
  const [custom, setCustom] = useState({ from: shiftDateString(today, 'day', -29, tz), to: today });
  const [customPicker, setCustomPicker] = useState<null | 'from' | 'to'>(null);
  const [monthPicker, setMonthPicker] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [refreshing, setRefreshing] = useState(false);

  const params: RangeParams =
    period === 'custom'
      ? { period, from: custom.from, to: custom.to, type }
      : { period, date: anchor, type };
  const range = period === 'custom' ? custom : rangeStrings(period, anchor, tz);
  const spanDays =
    Math.round(
      (parseDateInTz(range.to, tz).getTime() - parseDateInTz(range.from, tz).getTime()) /
        86_400_000,
    ) + 1;
  const granularity: 'day' | 'week' | 'month' =
    period === 'year'
      ? 'month'
      : period === 'custom'
        ? spanDays <= 62
          ? 'day'
          : spanDays <= 366
            ? 'week'
            : 'month'
        : 'day';

  const summary = useSummary(params);
  const series = useTimeseries(
    { granularity, from: range.from, to: range.to, type },
    period !== 'day',
  );
  const weekRange = rangeStrings('week', period === 'custom' ? custom.to : anchor, tz);
  const week = useTimeseries({ granularity: 'day', from: weekRange.from, to: weekRange.to, type });
  const yearRange = rangeStrings('year', period === 'custom' ? custom.to : anchor, tz);
  const year = useTimeseries({
    granularity: 'month',
    from: yearRange.from,
    to: yearRange.to,
    type,
  });
  const cats = useCategoryBreakdown(params);
  const items = useItems({ ...params, limit: 20 });
  const methods = usePaymentMethods(params);
  const patterns = usePatterns(params);

  const mainData: ChartPoint[] = useMemo(() => {
    if (period === 'day') {
      return (patterns.data?.hourOfDay ?? []).map((h) => ({
        key: String(h.bucket),
        label: hourLabel(h.bucket),
        fullLabel: `${hourLabel(h.bucket)}m`,
        value: h.total,
        count: h.count,
      }));
    }
    return (series.data ?? []).map((p) => {
      const d = parseDateInTz(p.bucket, tz);
      return {
        key: p.bucket,
        label:
          granularity === 'month'
            ? new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: tz }).format(d)
            : shortDay(p.bucket, tz),
        fullLabel:
          granularity === 'month'
            ? formatMonthLabel(d, tz)
            : granularity === 'week'
              ? `Wk ${shortDay(p.bucket, tz)}`
              : shortDay(p.bucket, tz),
        value: p.total,
        count: p.count,
      };
    });
  }, [period, patterns.data, series.data, granularity, tz]);

  const weekData: ChartPoint[] = (week.data ?? []).map((p, i) => ({
    key: p.bucket,
    label: WEEKDAY_INITIALS[i] ?? '',
    fullLabel: shortDay(p.bucket, tz),
    value: p.total,
  }));
  const yearData: ChartPoint[] = (year.data ?? []).map((p) => {
    const d = parseDateInTz(p.bucket, tz);
    return {
      key: p.bucket,
      label: new Intl.DateTimeFormat('en-IN', { month: 'narrow', timeZone: tz }).format(d),
      fullLabel: formatMonthLabel(d, tz),
      value: p.total,
    };
  });
  const dowData: ChartPoint[] = (patterns.data?.dayOfWeek ?? []).map((d) => ({
    key: String(d.bucket),
    label: WEEKDAY_INITIALS[d.bucket] ?? '',
    fullLabel: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d.bucket],
    value: d.total,
  }));
  const hourData: ChartPoint[] = (patterns.data?.hourOfDay ?? []).map((h) => ({
    key: String(h.bucket),
    label: h.bucket % 6 === 0 ? hourLabel(h.bucket) : '',
    fullLabel: `${hourLabel(h.bucket)}m`,
    value: h.total,
  }));

  const catRows = cats.data ?? [];
  const catTotal = catRows.reduce((s, c) => s + c.total, 0);
  const top5 = catRows.slice(0, 5);
  const rest = catRows.slice(5);
  const slices = [
    ...top5.map((c) => ({
      id: c.categoryId ?? 'none',
      name: c.name,
      value: c.total,
      percent: c.percent,
      color: c.color,
    })),
    ...(rest.length
      ? [
          {
            id: 'other',
            name: 'Other',
            value: rest.reduce((s, c) => s + c.total, 0),
            percent: Math.round(rest.reduce((s, c) => s + c.percent, 0) * 10) / 10,
            color: null,
          },
        ]
      : []),
  ];
  const mode = dark ? 'dark' : 'light';

  const s = summary.data;
  const total = s ? (type === 'expense' ? s.totalExpense : s.totalIncome) : 0;
  const change = s?.changePercent ?? null;
  const good = change !== null && (type === 'expense' ? change <= 0 : change >= 0);
  const word = type === 'expense' ? 'spent' : 'received';
  const anchorLabel =
    period === 'day'
      ? formatDate(parseDateInTz(anchor, tz), tz)
      : period === 'week'
        ? `${shortDay(range.from, tz)} – ${shortDay(range.to, tz)}`
        : period === 'month'
          ? formatMonthLabel(parseDateInTz(anchor, tz), tz)
          : anchor.slice(0, 4);
  const monthOptions = Array.from({ length: 24 }, (_, i) =>
    shiftDateString(`${today.slice(0, 7)}-01`, 'month', -i, tz),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      summary.refetch(),
      series.refetch(),
      cats.refetch(),
      items.refetch(),
      methods.refetch(),
      patterns.refetch(),
      week.refetch(),
      year.refetch(),
    ]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerClassName="gap-4 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={palette.saffron}
          />
        }
      >
        <View className="flex-row items-center justify-between px-5 pt-4">
          <Text weight="display" className="text-[34px] leading-[40px]" accessibilityRole="header">
            Analytics
          </Text>
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: 'Spent' },
              { value: 'income', label: 'Income' },
            ]}
            className="w-44"
          />
        </View>

        {/* Period controls */}
        <View className="gap-3 px-4">
          <Segmented
            value={period}
            onChange={(p) => {
              setPeriod(p);
              if (p !== 'custom') setAnchor(today);
            }}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          {period === 'custom' ? (
            <View className="flex-row items-center justify-center gap-2">
              {(['from', 'to'] as const).map((k) => (
                <Pressable
                  key={k}
                  accessibilityRole="button"
                  accessibilityLabel={`${k === 'from' ? 'Start' : 'End'} date, ${custom[k]}`}
                  onPress={() => setCustomPicker(k)}
                  className="h-11 flex-1 items-center justify-center rounded-xl border border-border bg-surface"
                >
                  <Text weight="semibold" className="text-sm">
                    {formatDate(parseDateInTz(custom[k], tz), tz)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="flex-row items-center justify-center gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Previous ${period}`}
                onPress={() => setAnchor((a) => shiftDateString(a, period, -1, tz))}
                className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface"
              >
                <ChevronLeft size={18} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  period === 'month' ? `Choose month, ${anchorLabel}` : anchorLabel
                }
                disabled={period !== 'month'}
                onPress={() => setMonthPicker(true)}
                className="h-11 min-w-40 flex-row items-center justify-center gap-1 rounded-xl border border-border bg-surface px-4"
              >
                <Text weight="semibold" className="text-sm">
                  {anchorLabel}
                </Text>
                {period === 'month' && <ChevronDown size={16} color={colors.text} />}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Next ${period}`}
                disabled={range.to >= today}
                onPress={() => setAnchor((a) => shiftDateString(a, period, 1, tz))}
                className={cn(
                  'h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface',
                  range.to >= today && 'opacity-30',
                )}
              >
                <ChevronRight size={18} color={colors.text} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Total + trend */}
        <Section title={`Total ${word}`}>
          {summary.isError ? (
            <ErrorState onRetry={() => void summary.refetch()} />
          ) : s ? (
            <>
              <CountUp value={total} weight="semibold" className="text-[36px] leading-[44px]" />
              {change !== null ? (
                <View
                  className={cn(
                    'mt-1 self-start rounded-md px-2 py-0.5',
                    good ? 'bg-income/10' : 'bg-expense/10',
                  )}
                >
                  <Text
                    weight="semibold"
                    className={cn('text-sm', good ? 'text-income' : 'text-expense')}
                  >
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from {PREV[period]}
                  </Text>
                </View>
              ) : (
                <Text muted className="mt-1 text-sm">
                  No data for {PREV[period]} to compare
                </Text>
              )}
              <View className="mt-4">
                {s.count === 0 ? (
                  <EmptyState title={`Nothing ${word} in this period`} />
                ) : (period === 'day' ? patterns.isLoading : series.isLoading) ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <AreaChart data={mainData} />
                )}
              </View>
            </>
          ) : (
            <Skeleton className="h-60 w-full" />
          )}
        </Section>

        <Section
          title="Daily this week"
          subtitle={`${shortDay(weekRange.from, tz)} – ${shortDay(weekRange.to, tz)}`}
        >
          {week.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BarChart
              data={weekData}
              highlightKey={weekData.some((p) => p.key === today) ? today : undefined}
            />
          )}
        </Section>

        <Section title="By category">
          {cats.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : catRows.length === 0 ? (
            <Text muted className="py-6 text-center text-sm">
              No categories to show yet
            </Text>
          ) : (
            <>
              <View className="items-center py-2">
                <Donut slices={slices} total={catTotal} />
              </View>
              <View className="mt-3">
                {catRows.map((c, i) => (
                  <View
                    key={c.categoryId ?? 'none'}
                    className="min-h-12 flex-row items-center gap-3"
                    accessible
                    accessibilityLabel={`${c.name}: ${formatMoney(c.total)}, ${c.percent}%`}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor:
                          i < 5 ? chartColorFor(c.color, mode) : chartPalette.neutral[mode],
                      }}
                    />
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <Text weight="medium" className="flex-1" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text weight="semibold">{formatMoney(c.total)}</Text>
                    <Text muted className="w-12 text-right text-sm">
                      {c.percent}%
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Section>

        <Section
          title={`Item-wise ${type === 'expense' ? 'spending' : 'income'}`}
          subtitle={`How much have I ${word} on each item?`}
        >
          {items.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (items.data ?? []).length === 0 ? (
            <Text muted className="py-4 text-center text-sm">
              No items in this period
            </Text>
          ) : (
            (items.data ?? []).map((it, i) => (
              <Pressable
                key={it.key}
                accessibilityRole="button"
                accessibilityLabel={`${it.title}: ${formatMoney(it.total)} across ${it.count} times`}
                onPress={() =>
                  router.push({ pathname: '/item/[title]', params: { title: it.title } })
                }
                className={cn(
                  'min-h-14 flex-row items-center gap-3 py-2',
                  i > 0 && 'border-t border-border',
                )}
              >
                <View className="flex-1">
                  <Text weight="semibold" numberOfLines={1}>
                    {i < 5 ? `${i + 1}. ` : ''}
                    {it.title}
                  </Text>
                  <Text muted className="text-sm" numberOfLines={1}>
                    {formatMoney(it.total)} across {it.count} time{it.count === 1 ? '' : 's'} · avg{' '}
                    {formatMoney(it.average)}
                  </Text>
                </View>
                <Text weight="semibold">{formatMoney(it.total)}</Text>
                <Go size={16} color={colors.textSecondary} />
              </Pressable>
            ))
          )}
        </Section>

        <Section title="Payment methods" subtitle="Cash vs UPI vs Card">
          {(methods.data ?? []).length === 0 ? (
            <Text muted className="py-4 text-center text-sm">
              No data yet
            </Text>
          ) : (
            <ShareBars
              rows={(methods.data ?? []).map((m) => ({
                key: m.paymentMethod,
                label: PAYMENT_METHOD_LABELS[m.paymentMethod as PaymentMethod] ?? m.paymentMethod,
                value: m.total,
                percent: m.percent,
              }))}
            />
          )}
        </Section>

        <Section title="By day of week" subtitle="Which days you spend most">
          {patterns.isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <BarChart data={dowData} height={150} />
          )}
        </Section>

        <Section title="By time of day" subtitle="When you spend most">
          {patterns.isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <BarChart data={hourData} height={150} />
          )}
        </Section>

        <Section
          title={`${yearRange.from.slice(0, 4)} overview`}
          subtitle={`${formatMoney((year.data ?? []).reduce((a, p) => a + p.total, 0))} ${word} this year`}
        >
          {year.isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <BarChart data={yearData} height={180} highlightKey={`${today.slice(0, 7)}-01`} />
          )}
        </Section>
      </ScrollView>

      {/* Month dropdown */}
      <Modal
        visible={monthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPicker(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setMonthPicker(false)}
          accessibilityLabel="Close month picker"
        >
          <View className="max-h-[60%] rounded-t-[28px] bg-surface pb-8 pt-3">
            <Text weight="bold" className="px-5 pb-2 text-lg">
              Choose month
            </Text>
            <ScrollView>
              {monthOptions.map((m) => {
                const selected = m.slice(0, 7) === anchor.slice(0, 7);
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setAnchor(m);
                      setMonthPicker(false);
                    }}
                    className={cn(
                      'min-h-12 justify-center px-5',
                      selected && 'bg-accent-soft dark:bg-surface-muted',
                    )}
                  >
                    <Text weight={selected ? 'bold' : 'regular'}>
                      {formatMonthLabel(parseDateInTz(m, tz), tz)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {customPicker && (
        <DateTimePicker
          value={parseDateInTz(custom[customPicker], tz)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onChange={(e, d) => {
            const which = customPicker;
            setCustomPicker(null);
            if (e.type !== 'set' || !d) return;
            const key = dayKey(d, tz);
            setCustom((c) => {
              const next = { ...c, [which]: key };
              return next.from <= next.to
                ? next
                : which === 'from'
                  ? { from: key, to: key }
                  : { from: key, to: key };
            });
          }}
        />
      )}
    </SafeAreaView>
  );
}
