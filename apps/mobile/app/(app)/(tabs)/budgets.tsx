import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatINR } from '@paipai/shared/money';
import { palette } from '@paipai/shared/tokens';
import { CategoryIcon } from '@/components/category-icon';
import { Card, Skeleton, Text, cn } from '@/components/ui';
import { BudgetEditor } from '@/features/budget/budget-editor';
import { useCategoryBreakdown, useMe, useSummary } from '@/lib/queries';

/** Overall monthly budget progress + this month's spend by category. */
export default function Budgets() {
  const { data: me, isLoading } = useMe();
  const summary = useSummary({ period: 'month', type: 'expense' });
  const cats = useCategoryBreakdown({ period: 'month', type: 'expense' });
  const [editing, setEditing] = useState(false);
  const budget = me?.monthlyBudget ?? null;
  const spent = summary.data?.thisMonth ?? 0;
  const pct = budget ? Math.round((spent / budget) * 100) : 0;
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-4 px-4 pb-10 pt-4"
        >
          <Text weight="extrabold" className="px-1 text-[28px]" accessibilityRole="header">
            Budgets
          </Text>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !budget || editing ? (
            <Card>
              <Text weight="semibold" className="mb-1 text-base">
                {budget ? 'Edit monthly budget' : 'Set a monthly budget'}
              </Text>
              <Text muted className="mb-4 text-sm">
                We&apos;ll show your progress and warn you at 80% and 100%.
              </Text>
              <BudgetEditor initial={budget} onDone={() => setEditing(false)} />
            </Card>
          ) : (
            <View className="rounded-card bg-forest p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-white/70">Monthly budget</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit budget"
                  onPress={() => setEditing(true)}
                  className="h-11 w-11 items-center justify-center rounded-full"
                >
                  <Pencil size={18} color="#fff" />
                </Pressable>
              </View>
              <Text weight="semibold" className="text-[34px] text-white">
                {formatINR(Math.max(budget - spent, 0))}
                <Text className="text-base text-white/70"> left</Text>
              </Text>
              <View
                className="mt-4 h-3 overflow-hidden rounded-full bg-white/15"
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.min(pct, 100) }}
                accessibilityLabel={`Budget used ${pct}%`}
              >
                <View
                  className={cn(
                    'h-full rounded-full',
                    state === 'over' ? 'bg-expense' : state === 'warn' ? 'bg-warning' : 'bg-lime',
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </View>
              <Text className="mt-2 text-sm text-white/80">
                {formatINR(spent)} of {formatINR(budget)} · {pct}% used
              </Text>
              {state !== 'ok' && (
                <View
                  className={cn(
                    'mt-3 rounded-2xl p-3',
                    state === 'over' ? 'bg-expense' : 'bg-warning',
                  )}
                >
                  <Text weight="semibold" className="text-sm text-white">
                    {state === 'over'
                      ? `You're ${formatINR(spent - budget)} over budget this month.`
                      : `Heads up: you've used ${pct}% of your budget.`}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Card>
            <Text weight="semibold" className="mb-3 text-base">
              This month by category
            </Text>
            {cats.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (cats.data ?? []).length === 0 ? (
              <Text muted className="py-4 text-center text-sm">
                No spending yet this month
              </Text>
            ) : (
              (cats.data ?? []).map((c) => (
                <View
                  key={c.categoryId ?? 'none'}
                  className="mb-3"
                  accessible
                  accessibilityLabel={`${c.name}: ${formatINR(c.total)}, ${c.percent}% of spending`}
                >
                  <View className="flex-row items-center gap-3">
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <Text weight="medium" className="flex-1" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text weight="semibold">{formatINR(c.total)}</Text>
                  </View>
                  <View className="ml-12 mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <View
                      style={{
                        width: `${Math.max(c.percent, 2)}%`,
                        height: '100%',
                        borderRadius: 999,
                        backgroundColor: palette.forestMid,
                      }}
                    />
                  </View>
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
