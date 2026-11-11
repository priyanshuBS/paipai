import NetInfo from '@react-native-community/netinfo';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { setDisplayCurrency } from '@paipai/shared/money';
import { useSnackbar } from '@/components/snackbar';
import { AppLockProvider } from '@/lib/app-lock';
import { registerForPush } from '@/lib/notifications';
import { flushQueue } from '@/lib/offline-queue';
import { useMe } from '@/lib/queries';
import { useTheme } from '@/theme/theme';

// TanStack Query pauses fetching while offline and resumes on reconnect.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((s) =>
    setOnline(Boolean(s.isConnected) && s.isInternetReachable !== false),
  ),
);

/** Background duties for a signed-in session. */
function useSessionEffects() {
  const qc = useQueryClient();
  const snack = useSnackbar();
  const { data: me } = useMe();
  const { setPreference } = useTheme();
  const themeApplied = useRef(false);

  // Account preferences (currency now; theme once per session from the server).
  if (me) setDisplayCurrency(me.currency);
  useEffect(() => {
    if (me && !themeApplied.current) {
      themeApplied.current = true;
      setPreference(me.theme);
    }
  }, [me, setPreference]);

  // Sync the offline queue on reconnect and when the app returns to the foreground.
  useEffect(() => {
    const sync = async () => {
      const { synced, dropped } = await flushQueue();
      if (synced || dropped) {
        await qc.invalidateQueries();
        if (synced) snack(`Synced ${synced} offline ${synced === 1 ? 'entry' : 'entries'}`);
        if (dropped)
          snack({
            message: `${dropped} offline ${dropped === 1 ? 'entry was' : 'entries were'} invalid and skipped`,
            tone: 'error',
          });
      }
    };
    void sync();
    const net = NetInfo.addEventListener((s) => {
      if (s.isConnected && s.isInternetReachable !== false) void sync();
    });
    const app = AppState.addEventListener('change', (s) => s === 'active' && void sync());
    return () => {
      net();
      app.remove();
    };
  }, [qc, snack]);

  // Push token for budget alerts (best effort; needs a dev/production build).
  useEffect(() => {
    void registerForPush();
  }, []);

  // Tapping the daily reminder opens Quick Add.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      if (
        (r.notification.request.content.data as { type?: string } | undefined)?.type === 'reminder'
      ) {
        router.push('/add-transaction');
      }
    });
    return () => sub.remove();
  }, []);
}

function SessionEffects() {
  useSessionEffects();
  return null;
}

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <AppLockProvider>
      <SessionEffects />
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
        <Stack.Screen name="recurring" options={{ headerShown: true, title: 'Recurring' }} />
        <Stack.Screen name="categories" options={{ headerShown: true, title: 'Categories' }} />
        <Stack.Screen name="report" options={{ headerShown: true, title: 'Monthly report' }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
        <Stack.Screen
          name="add-transaction"
          options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="welcome" options={{ presentation: 'modal', gestureEnabled: false }} />
      </Stack>
    </AppLockProvider>
  );
}
