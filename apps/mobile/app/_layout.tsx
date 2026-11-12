import '../global.css';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SnackbarProvider } from '@/components/snackbar';
import { useSession } from '@/lib/auth-client';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider, useTheme } from '@/theme/theme';

void SplashScreen.preventAutoHideAsync();

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'paipai:query-cache' });

function RootNavigator() {
  const { data: session, isPending } = useSession();
  const { dark, colors } = useTheme();
  const signedIn = Boolean(session?.user);
  // Better Auth re-checks the session whenever the app returns to the foreground,
  // and while signed out each re-check reports isPending again. Gate only the very
  // first check: unmounting the navigator later would throw the user back to /login
  // (e.g. while they switch to their email app to copy the code).
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (!isPending && !booted) {
      setBooted(true);
      void SplashScreen.hideAsync();
    }
  }, [isPending, booted]);

  if (!booted) return null;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24, buster: 'v1' }}
        >
          <ThemeProvider>
            <SnackbarProvider>
              <RootNavigator />
            </SnackbarProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
