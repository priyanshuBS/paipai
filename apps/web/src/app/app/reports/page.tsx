'use client';

import { Download, FileSpreadsheet, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  DEFAULT_TIMEZONE,
  dayKey,
  formatDate,
  formatMonthLabel,
  parseDateInTz,
  shiftDateString,
} from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import { PageHeader } from '@/components/app/app-shell';
import { CategoryIcon } from '@/components/category-icon';
import { ChartCard, SpendBarChart, type ChartPoint } from '@/components/charts/charts';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, ErrorState, Input, Label, Select, Skeleton } from '@/components/ui/primitives';
import { api, ApiError } from '@/lib/api';
import { useMe, useMonthlyReport } from '@/lib/queries';
import { cn } from '@/lib/utils';

async function download(url: string, fallbackName: string) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new ApiError(res.status, 'EXPORT_FAILED', body?.error?.message ?? 'Export failed');
  }
  const name =
    /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName;
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function ExportCard({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState<null | 'csv' | 'pdf'>(null);

  async function run(format: 'csv' | 'pdf') {
    if (from > to) return toast.error('Start date must be before the end date');
    setBusy(format);
    try {
      await download(api.exportUrl(format, from, to), `paipai-${from}-to-${to}.${format}`);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-semibold">
        <Download className="size-4" aria-hidden /> Export transactions
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Download any date range as a spreadsheet (CSV) or a PDF statement.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ex-from">From</Label>
          <Input
            id="ex-from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ex-to">To</Label>
          <Input
            id="ex-to"
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void run('csv')} loading={busy === 'csv'}>
          <FileSpreadsheet /> CSV
        </Button>
        <Button onClick={() => void run('pdf')} loading={busy === 'pdf'}>
          <FileText /> PDF statement
        </Button>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const today = dayKey(new Date(), tz);
  const [month, setMonth] = useState(today.slice(0, 7));
  const q = useMonthlyReport(month);
  const r = q.data;
  const months = Array.from({ length: 24 }, (_, i) =>
    shiftDateString(`${today.slice(0, 7)}-01`, 'month', -i, tz).slice(0, 7),
  );
  const monthStart = `${month}-01`;
  const monthEnd = shiftDateString(shiftDateString(monthStart, 'month', 1, tz), 'day', -1, tz);

  const daily: ChartPoint[] = (r?.daily ?? []).map((p) => ({
    key: p.bucket,
    label: String(Number(p.bucket.slice(8))),
    fullLabel: formatDate(parseDateInTz(p.bucket, tz), tz),
    value: p.total,
    count: p.count,
  }));
  const change = r?.summary.changePercent ?? null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Reports"
        subtitle="Your monthly summary and exports"
        action={
          <>
            <label htmlFor="r-month" className="sr-only">
              Month
            </label>
            <Select id="r-month" value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(parseDateInTz(`${m}-01`, tz), tz)}
                </option>
              ))}
            </Select>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 px-4 pt-4 sm:px-8 lg:grid-cols-3">
        {q.isError ? (
          <div className="lg:col-span-3">
            <ErrorState onRetry={() => void q.refetch()} />
          </div>
        ) : !r ? (
          <>
            <Skeleton className="h-36 lg:col-span-3" />
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </>
        ) : (
          <>
            <section
              aria-label={`${r.label} summary`}
              className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-4"
            >
              {[
                { label: 'Spent', value: formatMoney(r.summary.totalExpense), cls: '' },
                { label: 'Income', value: formatMoney(r.summary.totalIncome), cls: 'text-income' },
                { label: 'Net', value: formatMoney(r.summary.net), cls: '' },
                { label: 'Average per day', value: formatMoney(r.averagePerDay), cls: '' },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={cn('tabular mt-1 text-xl font-semibold', s.cls)}>{s.value}</p>
                </Card>
              ))}
            </section>

            <Card className="lg:col-span-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {change !== null && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-semibold',
                      change <= 0 ? 'text-income' : 'text-expense',
                    )}
                  >
                    {change <= 0 ? (
                      <TrendingDown className="size-4" aria-hidden />
                    ) : (
                      <TrendingUp className="size-4" aria-hidden />
                    )}
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% spending vs last month
                  </span>
                )}
                <span className="text-muted-foreground">{r.summary.count} expenses</span>
                {r.biggestExpense && (
                  <span className="text-muted-foreground">
                    Biggest: <strong className="text-foreground">{r.biggestExpense.title}</strong>{' '}
                    {formatMoney(r.biggestExpense.amount)} on{' '}
                    {formatDate(r.biggestExpense.occurredAt, tz)}
                  </span>
                )}
              </div>
            </Card>

            <ChartCard
              className="lg:col-span-2"
              title={`Daily spending · ${r.label}`}
              table={{
                columns: ['Day', 'Amount', 'Count'],
                rows: daily.map((d) => [
                  d.fullLabel ?? d.label,
                  formatMoney(d.value),
                  d.count ?? 0,
                ]),
              }}
            >
              {r.summary.totalExpense === 0 ? (
                <EmptyState title="Nothing spent this month" />
              ) : (
                <SpendBarChart data={daily} height={220} showYAxis />
              )}
            </ChartCard>

            <Card>
              <h2 className="mb-3 font-semibold">Top items</h2>
              {r.topItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses yet</p>
              ) : (
                <ol className="space-y-3">
                  {r.topItems.map((it, i) => (
                    <li key={it.key} className="flex items-center gap-3">
                      <span className="w-4 text-sm font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{it.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {it.count}× · avg {formatMoney(it.average)}
                        </span>
                      </span>
                      <span className="tabular font-semibold">{formatMoney(it.total)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <h2 className="mb-3 font-semibold">Where it went</h2>
              {r.categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses yet</p>
              ) : (
                <ul className="space-y-2">
                  {r.categories.map((c) => (
                    <li key={c.categoryId ?? 'none'} className="flex items-center gap-3">
                      <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between text-sm">
                          <span className="truncate font-medium">{c.name}</span>
                          <span className="tabular font-semibold">
                            {formatMoney(c.total)}{' '}
                            <span className="font-normal text-muted-foreground">
                              · {c.percent}%
                            </span>
                          </span>
                        </span>
                        <span
                          className="mt-1 block h-2 overflow-hidden rounded-full bg-surface-muted"
                          aria-hidden
                        >
                          <span
                            className="block h-full rounded-full bg-accent"
                            style={{ width: `${Math.max(c.percent, 2)}%` }}
                          />
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Budgets</h2>
              {r.budgets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No monthly budgets set.</p>
              ) : (
                <ul className="space-y-3">
                  {r.budgets.map((b) => (
                    <li key={b.id}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{b.categoryName ?? 'Overall'}</span>
                        <span
                          className={cn(
                            'font-semibold',
                            b.status === 'over'
                              ? 'text-expense'
                              : b.status === 'warning'
                                ? 'text-warning'
                                : '',
                          )}
                        >
                          {b.percent}%
                        </span>
                      </div>
                      <div
                        className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted"
                        aria-hidden
                      >
                        <div
                          className={cn(
                            'h-full rounded-full',
                            b.status === 'over'
                              ? 'bg-expense'
                              : b.status === 'warning'
                                ? 'bg-warning'
                                : 'bg-accent',
                          )}
                          style={{ width: `${Math.min(b.percent, 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        <div className="lg:col-span-3">
          <ExportCard
            key={month}
            defaultFrom={monthStart}
            defaultTo={monthEnd > today ? today : monthEnd}
          />
        </div>
      </div>
    </div>
  );
}
