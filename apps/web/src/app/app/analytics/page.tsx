'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
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
import { formatINR } from '@paipai/shared/money';
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type TransactionType,
} from '@paipai/shared/schemas';
import { PageHeader } from '@/components/app/app-shell';
import { CategoryIcon } from '@/components/category-icon';
import {
  CategoryDonut,
  ChartCard,
  ShareBars,
  SpendAreaChart,
  SpendBarChart,
  useChartTheme,
  type ChartPoint,
} from '@/components/charts/charts';
import { EmptyState } from '@/components/empty-state';
import { CountUp } from '@/components/money';
import { Card, ErrorState, Input, Segmented, Select, Skeleton } from '@/components/ui/primitives';
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
import { chartColorFor } from '@paipai/shared/tokens';
import { cn } from '@/lib/utils';

type UiPeriod = Period | 'custom';

const PERIODS: { value: UiPeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];

const PREV_LABEL: Record<UiPeriod, string> = {
  day: 'yesterday',
  week: 'last week',
  month: 'last month',
  year: 'last year',
  custom: 'previous period',
};

const shortDay = (key: string, tz: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: tz }).format(
    parseDateInTz(key, tz),
  );

function rangeStrings(period: Period, anchor: string, tz: string) {
  const r = getPeriodRange(period, parseDateInTz(anchor, tz), tz);
  return { from: dayKey(r.from, tz), to: dayKey(new Date(r.to.getTime() - 1), tz) };
}

function anchorLabel(period: Period, anchor: string, tz: string) {
  const d = parseDateInTz(anchor, tz);
  if (period === 'day') return formatDate(d, tz);
  if (period === 'week') {
    const { from, to } = rangeStrings('week', anchor, tz);
    return `${shortDay(from, tz)} – ${shortDay(to, tz)}`;
  }
  if (period === 'month') return formatMonthLabel(d, tz);
  return String(d.getFullYear());
}

export default function AnalyticsPage() {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const today = dayKey(new Date(), tz);
  const ct = useChartTheme();

  const [period, setPeriod] = useState<UiPeriod>('month');
  const [anchor, setAnchor] = useState(today);
  const [custom, setCustom] = useState({ from: shiftDateString(today, 'day', -29, tz), to: today });
  const [type, setType] = useState<TransactionType>('expense');
  const [itemQuery, setItemQuery] = useState('');

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
  const items = useItems({ ...params, limit: 50 });
  const methods = usePaymentMethods(params);
  const patterns = usePatterns(params);

  // ── shape chart data ──
  const mainData: ChartPoint[] = useMemo(() => {
    if (period === 'day') {
      return (patterns.data?.hourOfDay ?? []).map((h) => ({
        key: String(h.bucket),
        label: h.bucket % 6 === 0 ? `${h.bucket % 12 || 12}${h.bucket < 12 ? 'a' : 'p'}` : '',
        fullLabel: `${h.bucket % 12 || 12}:00 ${h.bucket < 12 ? 'am' : 'pm'}`,
        value: h.total,
        count: h.count,
      }));
    }
    return (series.data ?? []).map((p) => {
      const d = parseDateInTz(p.bucket, tz);
      const label =
        granularity === 'month'
          ? new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: tz }).format(d)
          : shortDay(p.bucket, tz);
      return {
        key: p.bucket,
        label,
        fullLabel:
          granularity === 'month'
            ? formatMonthLabel(d, tz)
            : granularity === 'week'
              ? `Week of ${shortDay(p.bucket, tz)}`
              : formatDate(d, tz),
        value: p.total,
        count: p.count,
      };
    });
  }, [period, patterns.data, series.data, granularity, tz]);

  const weekData: ChartPoint[] = (week.data ?? []).map((p, i) => ({
    key: p.bucket,
    label: WEEKDAY_INITIALS[i] ?? '',
    fullLabel: formatDate(parseDateInTz(p.bucket, tz), tz),
    value: p.total,
    count: p.count,
  }));
  const yearData: ChartPoint[] = (year.data ?? []).map((p) => ({
    key: p.bucket,
    label: new Intl.DateTimeFormat('en-IN', { month: 'narrow', timeZone: tz }).format(
      parseDateInTz(p.bucket, tz),
    ),
    fullLabel: formatMonthLabel(parseDateInTz(p.bucket, tz), tz),
    value: p.total,
    count: p.count,
  }));
  const dowData: ChartPoint[] = (patterns.data?.dayOfWeek ?? []).map((d) => ({
    key: String(d.bucket),
    label: WEEKDAY_INITIALS[d.bucket] ?? '',
    fullLabel: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][
      d.bucket
    ],
    value: d.total,
    count: d.count,
  }));
  const hourData: ChartPoint[] = (patterns.data?.hourOfDay ?? []).map((h) => ({
    key: String(h.bucket),
    label: h.bucket % 6 === 0 ? `${h.bucket % 12 || 12}${h.bucket < 12 ? 'a' : 'p'}` : '',
    fullLabel: `${h.bucket % 12 || 12}:00 ${h.bucket < 12 ? 'am' : 'pm'}`,
    value: h.total,
    count: h.count,
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

  const filteredItems = (items.data ?? []).filter(
    (i) => !itemQuery || i.title.toLowerCase().includes(itemQuery.toLowerCase()),
  );
  const s = summary.data;
  const total = s ? (type === 'expense' ? s.totalExpense : s.totalIncome) : 0;
  const change = s?.changePercent ?? null;
  const goodChange = change !== null && (type === 'expense' ? change <= 0 : change >= 0);
  const monthOptions = Array.from({ length: 24 }, (_, i) =>
    shiftDateString(`${today.slice(0, 7)}-01`, 'month', -i, tz),
  );
  const empty = s && s.count === 0;
  const typeWord = type === 'expense' ? 'spent' : 'received';

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Analytics"
        action={
          <Segmented
            label="Show expenses or income"
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: 'Expenses' },
              { value: 'income', label: 'Income' },
            ]}
          />
        }
      />

      {/* Period controls (one row above all charts) */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-8">
        <Segmented
          label="Period"
          value={period}
          onChange={(p) => {
            setPeriod(p);
            if (p !== 'custom') setAnchor(today);
          }}
          options={PERIODS}
          className="overflow-x-auto"
        />
        {period === 'month' ? (
          <>
            <label htmlFor="month" className="sr-only">
              Month
            </label>
            <Select
              id="month"
              value={`${anchor.slice(0, 7)}-01`}
              onChange={(e) => setAnchor(e.target.value)}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(parseDateInTz(m, tz), tz)}
                </option>
              ))}
            </Select>
          </>
        ) : period === 'custom' ? (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="From"
              value={custom.from}
              max={custom.to}
              onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))}
              className="h-11 w-auto rounded-full"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              aria-label="To"
              value={custom.to}
              min={custom.from}
              onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))}
              className="h-11 w-auto rounded-full"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-full bg-surface p-1 shadow-[var(--shadow-soft)]">
            <button
              type="button"
              aria-label={`Previous ${period}`}
              onClick={() => setAnchor((a) => shiftDateString(a, period, -1, tz))}
              className="flex size-9 items-center justify-center rounded-full hover:bg-surface-muted"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-28 text-center text-sm font-semibold" aria-live="polite">
              {anchorLabel(period, anchor, tz)}
            </span>
            <button
              type="button"
              aria-label={`Next ${period}`}
              disabled={rangeStrings(period, anchor, tz).to >= today}
              onClick={() => setAnchor((a) => shiftDateString(a, period, 1, tz))}
              className="flex size-9 items-center justify-center rounded-full hover:bg-surface-muted disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 sm:px-8 lg:grid-cols-3">
        {/* Total + trend */}
        <ChartCard
          className="lg:col-span-2"
          title={`Total ${typeWord}`}
          subtitle={
            s ? (
              <div className="mt-1">
                <CountUp
                  value={total}
                  className="block text-[36px] font-semibold leading-tight text-foreground"
                />
                {change !== null ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold',
                      goodChange ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense',
                    )}
                  >
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from {PREV_LABEL[period]}
                  </span>
                ) : (
                  <span className="text-sm">No data for {PREV_LABEL[period]} to compare</span>
                )}
              </div>
            ) : (
              <Skeleton className="mt-2 h-12 w-40" />
            )
          }
          table={{
            columns: [period === 'day' ? 'Hour' : 'Period', 'Amount', 'Count'],
            rows: mainData.map((p) => [p.fullLabel ?? p.label, formatINR(p.value), p.count ?? 0]),
          }}
        >
          {summary.isError ? (
            <ErrorState onRetry={() => void summary.refetch()} />
          ) : (period === 'day' ? patterns.isLoading : series.isLoading) ? (
            <Skeleton className="h-[220px] w-full" />
          ) : empty ? (
            <EmptyState
              title={`Nothing ${typeWord} in this period`}
              description="Pick another period, or add a transaction."
            />
          ) : (
            <SpendAreaChart data={mainData} />
          )}
        </ChartCard>

        {/* This week M..S */}
        <ChartCard
          title="Daily this week"
          subtitle={`${shortDay(weekRange.from, tz)} – ${shortDay(weekRange.to, tz)}`}
          table={{
            columns: ['Day', 'Amount'],
            rows: weekData.map((p) => [p.fullLabel ?? p.label, formatINR(p.value)]),
          }}
        >
          {week.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <SpendBarChart
              data={weekData}
              highlightKey={weekData.some((p) => p.key === today) ? today : undefined}
            />
          )}
        </ChartCard>

        {/* Category breakdown */}
        <ChartCard
          className="lg:col-span-2"
          title="By category"
          table={{
            columns: ['Category', 'Amount', '%', 'Count'],
            rows: catRows.map((c) => [c.name, formatINR(c.total), `${c.percent}%`, c.count]),
          }}
        >
          {cats.isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : catRows.length === 0 ? (
            <EmptyState title="No categories to show yet" />
          ) : (
            <div className="grid items-center gap-6 sm:grid-cols-[220px_1fr]">
              <CategoryDonut slices={slices} total={catTotal} />
              <ul className="space-y-1">
                {catRows.map((c, i) => (
                  <li
                    key={c.categoryId ?? 'none'}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-2"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: i < 5 ? chartColorFor(c.color, ct.mode) : ct.neutral }}
                      aria-hidden
                    />
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                    <span className="tabular font-semibold">{formatINR(c.total)}</span>
                    <span className="tabular w-12 text-right text-sm text-muted-foreground">
                      {c.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>

        {/* Payment methods */}
        <ChartCard title="Payment methods" subtitle="Cash vs UPI vs Card">
          {methods.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (methods.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>
          ) : (
            <ShareBars
              rows={(methods.data ?? []).map((m) => ({
                key: m.paymentMethod,
                label: PAYMENT_METHOD_LABELS[m.paymentMethod as PaymentMethod] ?? m.paymentMethod,
                value: m.total,
                percent: m.percent,
                count: m.count,
              }))}
            />
          )}
        </ChartCard>

        {/* Top 5 */}
        <Card className="lg:col-span-3">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-3 font-semibold">Top 5 categories</h2>
              <ol className="space-y-2">
                {top5.map((c, i) => (
                  <li key={c.categoryId ?? 'none'} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-semibold text-muted-foreground">{i + 1}</span>
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular font-semibold">{formatINR(c.total)}</span>
                  </li>
                ))}
                {top5.length === 0 && (
                  <li className="text-sm text-muted-foreground">Nothing yet</li>
                )}
              </ol>
            </div>
            <div>
              <h2 className="mb-3 font-semibold">Top 5 items</h2>
              <ol className="space-y-2">
                {(items.data ?? []).slice(0, 5).map((it, i) => (
                  <li key={it.key}>
                    <Link
                      href={`/app/analytics/items/${encodeURIComponent(it.title)}`}
                      className="flex min-h-9 items-center gap-3 rounded-lg hover:bg-surface-muted"
                    >
                      <span className="w-5 text-sm font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate">{it.title}</span>
                      <span className="text-sm text-muted-foreground">{it.count}×</span>
                      <span className="tabular font-semibold">{formatINR(it.total)}</span>
                    </Link>
                  </li>
                ))}
                {(items.data ?? []).length === 0 && (
                  <li className="text-sm text-muted-foreground">Nothing yet</li>
                )}
              </ol>
            </div>
          </div>
        </Card>

        {/* Item-wise */}
        <Card className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                Item-wise {type === 'expense' ? 'spending' : 'income'}
              </h2>
              <p className="text-sm text-muted-foreground">
                How much have I {typeWord} on each item?
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Search items"
                placeholder="Search items"
                value={itemQuery}
                onChange={(e) => setItemQuery(e.target.value)}
                className="h-11 rounded-full pl-10"
              />
            </div>
          </div>
          {items.isError ? (
            <ErrorState onRetry={() => void items.refetch()} />
          ) : items.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : filteredItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No items in this period
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredItems.map((it) => (
                <li key={it.key}>
                  <Link
                    href={`/app/analytics/items/${encodeURIComponent(it.title)}`}
                    className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{it.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {formatINR(it.total)} across {it.count} time{it.count === 1 ? '' : 's'} ·
                        avg {formatINR(it.average)} · last {formatDate(it.lastAt, tz)}
                      </span>
                    </span>
                    <span className="tabular font-semibold">{formatINR(it.total)}</span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Patterns */}
        <ChartCard
          title="By day of week"
          subtitle="Which days you spend most"
          table={{
            columns: ['Day', 'Amount', 'Count'],
            rows: dowData.map((d) => [d.fullLabel ?? d.label, formatINR(d.value), d.count ?? 0]),
          }}
        >
          {patterns.isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <SpendBarChart data={dowData} height={180} />
          )}
        </ChartCard>
        <ChartCard
          title="By time of day"
          subtitle="When you spend most"
          className="lg:col-span-2"
          table={{
            columns: ['Hour', 'Amount', 'Count'],
            rows: hourData
              .filter((h) => h.value > 0)
              .map((h) => [h.fullLabel ?? h.label, formatINR(h.value), h.count ?? 0]),
          }}
        >
          {patterns.isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <SpendBarChart data={hourData} height={180} />
          )}
        </ChartCard>

        {/* Yearly overview */}
        <ChartCard
          className="lg:col-span-3"
          title={`${yearRange.from.slice(0, 4)} overview`}
          subtitle={`${formatINR((year.data ?? []).reduce((a, p) => a + p.total, 0))} ${typeWord} this year`}
          table={{
            columns: ['Month', 'Amount', 'Count'],
            rows: yearData.map((p) => [p.fullLabel ?? p.label, formatINR(p.value), p.count ?? 0]),
          }}
        >
          {year.isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <SpendBarChart
              data={yearData}
              height={220}
              showYAxis
              highlightKey={`${today.slice(0, 7)}-01`}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
