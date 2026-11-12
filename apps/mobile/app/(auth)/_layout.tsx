import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { useTheme } from '@/theme/theme';

export default function AuthLayout() {
  const { colors } = useTheme();
  // Stable identity: Expo Router re-reports options whenever this object changes.
  const screenOptions = useMemo(
    () => ({ headerShown: false, contentStyle: { backgroundColor: colors.background } }),
    [colors.background],
  );
  return <Stack screenOptions={screenOptions} />;
}
