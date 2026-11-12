import NetInfo from '@react-native-community/netinfo';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
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

// Static per-screen options live outside render so their identity never changes.
const withHeader = (title: string) => ({ headerShown: true, title });
const SCREEN = {
  transactions: withHeader('Transactions'),
  item: withHeader(''),
  recurring: withHeader('Recurring'),
  categories: withHeader('Categories'),
  report: withHeader('Monthly report'),
  settings: withHeader('Settings'),
  add: { presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' } as const,
  welcome: { presentation: 'modal', gestureEnabled: false } as const,
};

export default function AppLayout() {
  const { colors } = useTheme();
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: { fontFamily: 'Inter_700Bold' },
      headerShadowVisible: false,
    }),
    [colors.background, colors.text],
  );
  return (
    <AppLockProvider>
      <SessionEffects />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transactions" options={SCREEN.transactions} />
        <Stack.Screen name="item/[title]" options={SCREEN.item} />
        <Stack.Screen name="recurring" options={SCREEN.recurring} />
        <Stack.Screen name="categories" options={SCREEN.categories} />
        <Stack.Screen name="report" options={SCREEN.report} />
        <Stack.Screen name="settings" options={SCREEN.settings} />
        <Stack.Screen name="add-transaction" options={SCREEN.add} />
        <Stack.Screen name="welcome" options={SCREEN.welcome} />
      </Stack>
    </AppLockProvider>
  );
}
