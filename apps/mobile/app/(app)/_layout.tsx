import { Stack } from 'expo-router';
import { useTheme } from '@/theme/theme';

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'Inter_700Bold' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="transactions" options={{ headerShown: true, title: 'Transactions' }} />
      <Stack.Screen name="item/[title]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen
        name="add-transaction"
        options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="welcome" options={{ presentation: 'modal', gestureEnabled: false }} />
    </Stack>
  );
}
