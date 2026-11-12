import { useEffect, useRef } from 'react';
import { AppState, Pressable, TextInput, View } from 'react-native';
import { extractOtp } from '@paipai/shared/otp';
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

  // Back from the email app: refocus so the keyboard offers the copied code.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !disabled) setTimeout(() => ref.current?.focus(), 250);
    });
    return () => sub.remove();
  }, [disabled]);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="6-digit verification code">
      <View className="flex-row justify-between gap-2">
        {digits.map((d, i) => {
          const focused = i === Math.min(value.length, 5);
          return (
            <View
              key={i}
              className={cn(
                'h-14 flex-1 items-center justify-center rounded-xl border bg-surface',
                invalid
                  ? 'border-expense'
                  : d
                    ? 'border-border-strong'
                    : focused
                      ? 'border-accent'
                      : 'border-border',
              )}
            >
              <Text weight="semibold" className="text-2xl">
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
          // A pasted sentence ("Your code is 482 913") resolves to just the code.
          const clean = (t.length > 6 ? extractOtp(t) : null) ?? t.replace(/\D/g, '').slice(0, 6);
          onChange(clean);
          if (clean.length === 6) onComplete?.(clean);
        }}
        editable={!disabled}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        caretHidden
        accessibilityLabel="Verification code"
        style={{ position: 'absolute', opacity: 0.01, width: 1, height: 1 }}
      />
    </Pressable>
  );
}
