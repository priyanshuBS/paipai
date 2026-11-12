import { router } from 'expo-router';
import { AlertTriangle, Pencil, Plus, Target, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatMoney, paiseToInputString, parseRupeesToPaise } from '@paipai/shared/money';
import type { BudgetPeriod, BudgetView } from '@paipai/shared/schemas';
import { palette } from '@paipai/shared/tokens';
import { CategoryIcon } from '@/components/category-icon';
import { EmptyState } from '@/components/empty-state';
import { Sheet } from '@/components/sheet';
import { useSnackbar } from '@/components/snackbar';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  FieldError,
  Input,
  Label,
  Skeleton,
  Text,
  cn,
} from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useBudgetMutations, useBudgets, useCategories } from '@/lib/queries';
import { useTheme } from '@/theme/theme';

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function BudgetForm({
  editing,
  existing,
  onClose,
}: {
  editing: BudgetView | null;
  existing: BudgetView[];
  onClose: () => void;
}) {
  const { data: categories = [] } = useCategories();
  const m = useBudgetMutations();
  const snack = useSnackbar();
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [period, setPeriod] = useState<BudgetPeriod>(editing?.period ?? 'monthly');
  const [amount, setAmount] = useState(editing ? paiseToInputString(editing.amount) : '');
  const [threshold, setThreshold] = useState(String(editing?.alertThresholdPercent ?? 80));
  const [error, setError] = useState<string>();
  const taken = new Set(
    existing
      .filter((b) => b.period === period && b.id !== editing?.id)
      .map((b) => b.categoryId ?? 'overall'),
  );
  const cats = categories.filter((c) => c.type === 'expense' && !c.isArchived);

  async function save() {
    const paise = parseRupeesToPaise(amount);
    const t = Number(threshold);
    if (!paise) return setError('Enter a budget amount, e.g. 5000');
    if (!Number.isInteger(t) || t < 1 || t > 100) return setError('Alert threshold must be 1–100');
    if (!editing && taken.has(categoryId ?? 'overall'))
      return setError('That budget already exists for this period');
    try {
      if (editing)
        await m.update.mutateAsync({
          id: editing.id,
          body: { amount: paise, alertThresholdPercent: t },
        });
      else
        await m.create.mutateAsync({ categoryId, period, amount: paise, alertThresholdPercent: t });
      snack(editing ? 'Budget updated' : 'Budget created');
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the budget');
    }
  }

  return (
    <Sheet
      visible
      title={editing ? 'Edit budget' : 'New budget'}
      onClose={onClose}
      footer={
        <Button
          title={editing ? 'Save budget' : 'Create budget'}
          size="lg"
          loading={m.create.isPending || m.update.isPending}
          onPress={() => void save()}
        />
      }
    >
      {!editing && (
        <>
          <View>
            <Label>Period</Label>
            <View className="flex-row gap-2">
              {PERIODS.map((p) => (
                <Chip
                  key={p.value}
                  label={p.label}
                  selected={period === p.value}
                  onPress={() => setPeriod(p.value)}
                />
              ))}
            </View>
          </View>
          <View>
            <Label>Applies to</Label>
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="Overall spending"
                selected={categoryId === null}
                onPress={() => setCategoryId(null)}
              />
              {cats.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  left={<CategoryIcon icon={c.icon} color={c.color} size="sm" />}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </View>
          </View>
        </>
      )}
      <View>
        <Label>Amount (₹)</Label>
        <Input
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="5000"
          autoFocus={!!editing}
        />
      </View>
      <View>
        <Label>Warn me at (% used)</Label>
        <Input
          value={threshold}
          onChangeText={(v) => setThreshold(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
        />
      </View>
      <FieldError>{error}</FieldError>
    </Sheet>
  );
}

function BudgetCard({
  b,
  onEdit,
  onDelete,
}: {
  b: BudgetView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const pct = Math.min(b.percent, 100);
  const name = b.categoryName ?? 'Overall spending';
  return (
    <Card>
      <View className="flex-row items-center gap-3">
        {b.categoryId ? (
          <CategoryIcon icon={b.categoryIcon} color={b.categoryColor} />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-[11px] border border-border bg-surface-muted">
            <Target size={18} color={colors.textSecondary} />
          </View>
        )}
        <View className="flex-1">
          <Text weight="semibold" numberOfLines={1}>
            {name}
          </Text>
          <Text muted className="text-sm">
            {PERIODS.find((p) => p.value === b.period)?.label} · alert at {b.alertThresholdPercent}%
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${name} budget`}
          onPress={onEdit}
          className="h-11 w-11 items-center justify-center"
        >
          <Pencil size={18} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${name} budget`}
          onPress={onDelete}
          className="h-11 w-11 items-center justify-center"
        >
          <Trash2 size={18} color={colors.expense} />
        </Pressable>
      </View>
      <View className="mt-4 flex-row items-baseline justify-between">
        <Text weight="semibold">{formatMoney(b.spent)}</Text>
        <Text muted className="text-sm">
          of {formatMoney(b.amount)}
        </Text>
      </View>
      <View
        className="mt-2 h-3 overflow-hidden rounded-full bg-accent-soft dark:bg-surface-muted"
        accessibilityRole="progressbar"
        accessibilityLabel={`${name}: ${b.percent}% used`}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      >
        <View
          className={cn(
            'h-full rounded-full',
            b.status === 'over'
              ? 'bg-expense'
              : b.status === 'warning'
                ? 'bg-warning'
                : 'bg-accent',
          )}
          style={{ width: `${pct}%` }}
        />
      </View>
      <Text
        className={cn(
          'mt-2 text-sm',
          b.status === 'over'
            ? 'text-expense'
            : b.status === 'warning'
              ? 'text-warning'
              : 'text-muted-foreground',
        )}
      >
        {b.status === 'over'
          ? `Over by ${formatMoney(-b.remaining)} · ${b.percent}%`
          : `${formatMoney(b.remaining)} left · ${b.percent}% used`}
      </Text>
    </Card>
  );
}

export default function Budgets() {
  const q = useBudgets();
  const m = useBudgetMutations();
  const snack = useSnackbar();
  const [form, setForm] = useState<{ open: boolean; editing: BudgetView | null }>({
    open: false,
    editing: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const budgets = q.data ?? [];
  const flagged = budgets.filter((b) => b.status !== 'ok');

  const remove = (b: BudgetView) =>
    Alert.alert('Delete budget?', `Remove the ${b.categoryName ?? 'overall'} budget?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void m.remove.mutateAsync(b.id).then(() => snack('Budget deleted')),
      },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-10 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={palette.cobalt}
            onRefresh={() => {
              setRefreshing(true);
              void q.refetch().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        <View className="flex-row items-center justify-between px-1">
          <Text weight="semibold" className="text-2xl tracking-tight" accessibilityRole="header">
            Budgets
          </Text>
          <Button
            title="New"
            icon={<Plus size={18} color="#fff" />}
            onPress={() => setForm({ open: true, editing: null })}
          />
        </View>

        {flagged.length > 0 && (
          <View
            accessibilityRole="alert"
            className="flex-row gap-3 rounded-card border border-warning/40 bg-warning/10 p-4"
          >
            <AlertTriangle size={20} color={palette.warning} />
            <View className="flex-1 gap-1">
              {flagged.map((b) => (
                <Text key={b.id} className="text-sm">
                  <Text weight="semibold" className="text-sm">
                    {b.categoryName ?? 'Overall'}
                  </Text>
                  :{' '}
                  {b.status === 'over'
                    ? `over by ${formatMoney(-b.remaining)}`
                    : `${b.percent}% used`}
                </Text>
              ))}
            </View>
          </View>
        )}

        {q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} />
        ) : q.isLoading ? (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        ) : budgets.length === 0 ? (
          <EmptyState
            title="No budgets yet"
            description="Start with an overall monthly budget, then add limits for categories like Food or Travel."
            action={
              <Button
                title="Create a budget"
                onPress={() => setForm({ open: true, editing: null })}
              />
            }
          />
        ) : (
          budgets.map((b) => (
            <BudgetCard
              key={b.id}
              b={b}
              onEdit={() => setForm({ open: true, editing: b })}
              onDelete={() => remove(b)}
            />
          ))
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/report')}
          className="items-center py-3"
        >
          <Text weight="semibold" className="text-accent">
            View monthly report →
          </Text>
        </Pressable>
      </ScrollView>
      {form.open && (
        <BudgetForm
          editing={form.editing}
          existing={budgets}
          onClose={() => setForm({ open: false, editing: null })}
        />
      )}
    </SafeAreaView>
  );
}
