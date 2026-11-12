import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  DEFAULT_TIMEZONE,
  dayKey,
  formatDate,
  formatMonthLabel,
  parseDateInTz,
  shiftDateString,
} from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import { BarChart, type ChartPoint } from '@/components/charts/charts';
import { CategoryIcon } from '@/components/category-icon';
import { useSnackbar } from '@/components/snackbar';
import { Button, Card, ErrorState, Skeleton, Text, cn } from '@/components/ui';
import { exportAndShare } from '@/features/export/export';
import { useMe, useMonthlyReport } from '@/lib/queries';
import { useTheme } from '@/theme/theme';

export default function ReportScreen() {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const { colors } = useTheme();
  const snack = useSnackbar();
  const today = dayKey(new Date(), tz);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [busy, setBusy] = useState<null | 'csv' | 'pdf'>(null);
  const q = useMonthlyReport(month);
  const r = q.data;
  const monthStart = `${month}-01`;
  const monthEnd = shiftDateString(shiftDateString(monthStart, 'month', 1, tz), 'day', -1, tz);
  const isCurrent = month === today.slice(0, 7);

  const daily: ChartPoint[] = (r?.daily ?? []).map((p) => ({
    key: p.bucket,
    label: Number(p.bucket.slice(8)) % 5 === 1 ? String(Number(p.bucket.slice(8))) : '',
    fullLabel: formatDate(parseDateInTz(p.bucket, tz), tz),
    value: p.total,
  }));

  async function runExport(format: 'csv' | 'pdf') {
    setBusy(format);
    try {
      await exportAndShare(format, monthStart, monthEnd > today ? today : monthEnd);
    } catch (e) {
      snack({ message: (e as Error).message || 'Export failed', tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  const change = r?.summary.changePercent ?? null;

  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-2">
      <View className="flex-row items-center justify-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setMonth(shiftDateString(monthStart, 'month', -1, tz).slice(0, 7))}
          className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface"
        >
          <ChevronLeft size={18} color={colors.text} />
        </Pressable>
        <Text weight="bold" className="min-w-36 text-center text-lg">
          {formatMonthLabel(parseDateInTz(monthStart, tz), tz)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          disabled={isCurrent}
          onPress={() => setMonth(shiftDateString(monthStart, 'month', 1, tz).slice(0, 7))}
          className={cn(
            'h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface',
            isCurrent && 'opacity-30',
          )}
        >
          <ChevronRight size={18} color={colors.text} />
        </Pressable>
      </View>

      {q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : !r ? (
        <>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </>
      ) : (
        <>
          <View className="flex-row flex-wrap gap-3">
            {[
              { label: 'Spent', value: formatMoney(r.summary.totalExpense), cls: '' },
              { label: 'Income', value: formatMoney(r.summary.totalIncome), cls: 'text-income' },
              { label: 'Net', value: formatMoney(r.summary.net), cls: '' },
              { label: 'Per day', value: formatMoney(r.averagePerDay), cls: '' },
            ].map((s) => (
              <Card key={s.label} className="w-[47.5%] p-4">
                <Text muted className="text-xs">
                  {s.label}
                </Text>
                <Text
                  weight="semibold"
                  className={cn('mt-1 text-lg', s.cls)}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {s.value}
                </Text>
              </Card>
            ))}
          </View>

          <Card>
            {change !== null && (
              <Text
                weight="semibold"
                className={cn('text-sm', change <= 0 ? 'text-income' : 'text-expense')}
              >
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% spending vs last month
              </Text>
            )}
            <Text muted className="mt-1 text-sm">
              {r.summary.count} expenses
              {r.biggestExpense
                ? ` · biggest: ${r.biggestExpense.title} ${formatMoney(r.biggestExpense.amount)}`
                : ''}
            </Text>
            <View className="mt-4">
              <BarChart data={daily} height={160} />
            </View>
          </Card>

          <Card>
            <Text weight="semibold" className="mb-2 text-base">
              Where it went
            </Text>
            {r.categories.length === 0 ? (
              <Text muted className="text-sm">
                No expenses this month
              </Text>
            ) : (
              r.categories.map((c) => (
                <View key={c.categoryId ?? 'none'} className="min-h-11 flex-row items-center gap-3">
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  <Text className="flex-1" numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text weight="semibold">{formatMoney(c.total)}</Text>
                  <Text muted className="w-12 text-right text-sm">
                    {c.percent}%
                  </Text>
                </View>
              ))
            )}
          </Card>

          <Card>
            <Text weight="semibold" className="mb-2 text-base">
              Top items
            </Text>
            {r.topItems.map((it, i) => (
              <View key={it.key} className="min-h-11 flex-row items-center gap-3">
                <Text muted weight="semibold" className="w-4">
                  {i + 1}
                </Text>
                <Text className="flex-1" numberOfLines={1}>
                  {it.title}{' '}
                  <Text muted className="text-xs">
                    · {it.count}×
                  </Text>
                </Text>
                <Text weight="semibold">{formatMoney(it.total)}</Text>
              </View>
            ))}
            {r.topItems.length === 0 && (
              <Text muted className="text-sm">
                No expenses this month
              </Text>
            )}
          </Card>
        </>
      )}

      <Card>
        <Text weight="semibold" className="text-base">
          Export this month
        </Text>
        <Text muted className="mb-3 text-sm">
          Share as a spreadsheet or a PDF statement.
        </Text>
        <View className="flex-row gap-2">
          <Button
            title="CSV"
            variant="outline"
            className="flex-1"
            icon={<FileSpreadsheet size={18} color={colors.text} />}
            loading={busy === 'csv'}
            onPress={() => void runExport('csv')}
          />
          <Button
            title="PDF"
            className="flex-1"
            icon={<FileText size={18} color="#fff" />}
            loading={busy === 'pdf'}
            onPress={() => void runExport('pdf')}
          />
        </View>
      </Card>
    </ScrollView>
  );
}
