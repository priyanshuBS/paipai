import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { formatMoney, paiseToInputString, parseRupeesToPaise } from '@paipai/shared/money';
import { Button, Chip, FieldError, Text } from '@/components/ui';
import { useUpdateMe } from '@/lib/queries';
import { useTheme } from '@/theme/theme';

const PRESETS = [10_000_00, 20_000_00, 30_000_00, 50_000_00];

/** Big ₹ input + presets for the overall monthly budget. */
export function BudgetEditor({
  initial,
  submitLabel = 'Save budget',
  onDone,
}: {
  initial: number | null;
  submitLabel?: string;
  onDone?: () => void;
}) {
  const { colors } = useTheme();
  const update = useUpdateMe();
  const [value, setValue] = useState(initial ? paiseToInputString(initial) : '');
  const [error, setError] = useState<string>();

  async function save() {
    const paise = parseRupeesToPaise(value);
    if (!paise) {
      setError('Enter a budget like 20000');
      return;
    }
    await update.mutateAsync({ monthlyBudget: paise });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone?.();
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-2 rounded-card bg-accent-soft px-5 py-3 dark:bg-surface-muted">
        <Text weight="semibold" muted className="text-3xl">
          ₹
        </Text>
        <TextInput
          value={value}
          onChangeText={(t) => {
            setValue(t.replace(/[^\d.,]/g, ''));
            setError(undefined);
          }}
          keyboardType="decimal-pad"
          placeholder="20,000"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Monthly budget in rupees"
          className="flex-1 py-1 font-inter-semibold text-4xl text-foreground"
        />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Chip
            key={p}
            label={formatMoney(p)}
            selected={parseRupeesToPaise(value) === p}
            onPress={() => setValue(String(p / 100))}
          />
        ))}
      </View>
      <FieldError>{error}</FieldError>
      <Button
        title={submitLabel}
        size="lg"
        loading={update.isPending}
        onPress={() => void save()}
      />
    </View>
  );
}
