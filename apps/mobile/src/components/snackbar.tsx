import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './ui';

interface SnackOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
  tone?: 'default' | 'error';
}

const Ctx = createContext<((o: SnackOptions | string) => void) | null>(null);

/** Bottom snackbar for confirmations and "Undo". */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<(SnackOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((o: SnackOptions | string) => {
    const opts = typeof o === 'string' ? { message: o } : o;
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setSnack({ ...opts, id });
    AccessibilityInfo.announceForAccessibility(opts.message);
    timer.current = setTimeout(
      () => setSnack((s) => (s?.id === id ? null : s)),
      opts.durationMs ?? 3500,
    );
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {snack && (
        <Animated.View
          key={snack.id}
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(150)}
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 92 }}
        >
          <View
            className={snack.tone === 'error' ? 'bg-expense' : 'bg-[#111111] dark:bg-lime'}
            style={{
              borderRadius: 18,
              paddingHorizontal: 16,
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text weight="medium" className="flex-1 py-3 text-sm text-white dark:text-forest">
              {snack.message}
            </Text>
            {snack.actionLabel && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  snack.onAction?.();
                  setSnack(null);
                }}
                className="h-11 justify-center pl-4"
              >
                <Text weight="bold" className="text-sm text-lime dark:text-forest">
                  {snack.actionLabel}
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export function useSnackbar() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSnackbar must be used inside <SnackbarProvider>');
  return v;
}
