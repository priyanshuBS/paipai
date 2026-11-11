import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { cn, Text } from './ui';

/**
 * Six-box OTP input backed by one hidden TextInput, so SMS/email autofill
 * (one-time-code) and paste work natively.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="6-digit verification code">
      <View className="flex-row justify-between gap-2">
        {digits.map((d, i) => {
          const focused = i === Math.min(value.length, 5);
          return (
            <View
              key={i}
              className={cn(
                'h-14 flex-1 items-center justify-center rounded-2xl border bg-surface',
                invalid
                  ? 'border-expense'
                  : d
                    ? 'border-forest-mid bg-accent-soft dark:bg-surface-muted'
                    : focused
                      ? 'border-forest-mid'
                      : 'border-border',
              )}
            >
              <Text weight="bold" className="text-2xl">
                {d}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => {
          const clean = t.replace(/\D/g, '').slice(0, 6);
          onChange(clean);
          if (clean.length === 6) onComplete?.(clean);
        }}
        editable={!disabled}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        caretHidden
        accessibilityLabel="Verification code"
        style={{ position: 'absolute', opacity: 0.01, width: 1, height: 1 }}
      />
    </Pressable>
  );
}
