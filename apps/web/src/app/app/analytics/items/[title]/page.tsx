'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  DEFAULT_TIMEZONE,
  formatDate,
  formatDayHeader,
  formatMonthLabel,
  formatTime,
  parseDateInTz,
} from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import { TransactionRow } from '@/components/app/transaction-row';
import { ChartCard, SpendAreaChart, type ChartPoint } from '@/components/charts/charts';
import { EmptyState } from '@/components/empty-state';
import { Card, ErrorState, Skeleton } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { useCategoryMap, useItemDetail, useMe } from '@/lib/queries';

export default function ItemDetailPage({ params }: { params: Promise<{ title: string }> }) {
  const { title: raw } = use(params);
  const title = decodeURIComponent(raw);
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const categories = useCategoryMap();
  const q = useItemDetail(title);
  const d = q.data;

  const series: ChartPoint[] = (d?.series ?? []).map((p) => {
    const date = parseDateInTz(p.bucket, tz);
    return {
      key: p.bucket,
      label:
        d?.granularity === 'month'
          ? new Intl.DateTimeFormat('en-IN', {
              month: 'short',
              year: '2-digit',
              timeZone: tz,
            }).format(date)
          : new Intl.DateTimeFormat('en-IN', {
              day: 'numeric',
              month: 'short',
              timeZone: tz,
            }).format(date),
      fullLabel:
        d?.granularity === 'month'
          ? formatMonthLabel(date, tz)
          : d?.granularity === 'week'
            ? `Week of ${formatDate(date, tz)}`
            : formatDate(date, tz),
      value: p.total,
      count: p.count,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-8 sm:pt-10">
      <Link
        href="/app/analytics"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Analytics
      </Link>

      {q.isError ? (
        q.error instanceof ApiError && q.error.status === 404 ? (
          <Card className="mt-4">
            <EmptyState
              title={`No entries for “${title}”`}
              description="Once you add it, its history will appear here."
            />
          </Card>
        ) : (
          <ErrorState onRetry={() => void q.refetch()} />
        )
      ) : !d ? (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{d.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {formatMoney(d.total)} across {d.count} time{d.count === 1 ? '' : 's'}
            {d.firstAt && ` since ${formatDate(d.firstAt, tz)}`}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Total', formatMoney(d.total)],
              ['Times', String(d.count)],
              ['Average', formatMoney(d.average)],
              ['Last', d.lastAt ? formatDate(d.lastAt, tz) : '—'],
            ].map(([k, v]) => (
              <Card key={k} className="p-4">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="tabular mt-1 text-lg font-semibold">{v}</p>
              </Card>
            ))}
          </div>

          <ChartCard
            className="mt-4"
            title="History"
            subtitle={
              d.granularity === 'month' ? 'Monthly' : d.granularity === 'week' ? 'Weekly' : 'Daily'
            }
            table={{
              columns: ['Period', 'Amount', 'Count'],
              rows: series.map((p) => [p.fullLabel ?? p.label, formatMoney(p.value), p.count ?? 0]),
            }}
          >
            <SpendAreaChart data={series} />
          </ChartCard>

          <Card className="mt-4 p-3">
            <h2 className="px-2 pb-2 pt-1 font-semibold">Entries</h2>
            <ul className="space-y-0.5">
              {d.transactions.map((t) => (
                <TransactionRow
                  key={t.id}
                  t={t}
                  tz={tz}
                  category={t.categoryId ? categories.get(t.categoryId) : undefined}
                  timeLabel={`${formatDayHeader(t.occurredAt, tz)} · ${formatTime(t.occurredAt, tz)}`}
                />
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
