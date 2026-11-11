import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import {
  DEFAULT_TIMEZONE,
  formatDate,
  formatDayHeader,
  formatMonthLabel,
  formatTime,
  parseDateInTz,
} from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import { AreaChart, type ChartPoint } from '@/components/charts/charts';
import { EmptyState } from '@/components/empty-state';
import { TransactionRow } from '@/components/transaction-row';
import { Card, ErrorState, Skeleton, Text } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useCategoryMap, useItemDetail, useMe } from '@/lib/queries';

export default function ItemDetailScreen() {
  const { title = '' } = useLocalSearchParams<{ title: string }>();
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
          ? new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: tz }).format(date)
          : new Intl.DateTimeFormat('en-IN', {
              day: 'numeric',
              month: 'short',
              timeZone: tz,
            }).format(date),
      fullLabel: d?.granularity === 'month' ? formatMonthLabel(date, tz) : formatDate(date, tz),
      value: p.total,
      count: p.count,
    };
  });

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-10">
      <Stack.Screen options={{ title: d?.title ?? title }} />
      {q.isError ? (
        q.error instanceof ApiError && q.error.status === 404 ? (
          <EmptyState title={`No entries for “${title}”`} />
        ) : (
          <ErrorState onRetry={() => void q.refetch()} />
        )
      ) : !d ? (
        <>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-56 w-full" />
        </>
      ) : (
        <>
          <View>
            <Text weight="extrabold" className="text-[28px]">
              {d.title}
            </Text>
            <Text muted>
              {formatMoney(d.total)} across {d.count} time{d.count === 1 ? '' : 's'}
              {d.firstAt ? ` since ${formatDate(d.firstAt, tz)}` : ''}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {[
              ['Total', formatMoney(d.total)],
              ['Times', String(d.count)],
              ['Average', formatMoney(d.average)],
              ['Last', d.lastAt ? formatDate(d.lastAt, tz) : '—'],
            ].map(([k, v]) => (
              <Card key={k} className="w-[47%] p-4">
                <Text muted className="text-xs">
                  {k}
                </Text>
                <Text weight="semibold" className="mt-1 text-lg">
                  {v}
                </Text>
              </Card>
            ))}
          </View>
          <Card>
            <Text weight="semibold" className="mb-2 text-base">
              History
            </Text>
            <AreaChart data={series} />
          </Card>
          <Card className="px-0 py-2">
            <Text weight="semibold" className="px-5 pb-1 pt-2 text-base">
              Entries
            </Text>
            {d.transactions.map((t) => (
              <TransactionRow
                key={t.id}
                t={t}
                tz={tz}
                category={t.categoryId ? categories.get(t.categoryId) : undefined}
                timeLabel={`${formatDayHeader(t.occurredAt, tz)} · ${formatTime(t.occurredAt, tz)}`}
              />
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
