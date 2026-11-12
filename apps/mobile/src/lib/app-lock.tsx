/**
 * Optional biometric app lock (Face ID / fingerprint, with device passcode
 * fallback). Locks on launch and after 30s in the background.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Fingerprint } from 'lucide-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, View } from 'react-native';
import { LogoMark } from '@/components/brand';
import { useTheme } from '@/theme/theme';
import { Button, Text } from '@/components/ui';

const KEY = 'paipai.app-lock';
const RELOCK_AFTER_MS = 30_000;

interface LockCtx {
  enabled: boolean;
  available: boolean;
  setEnabled: (v: boolean) => Promise<boolean>;
}

const Ctx = createContext<LockCtx | null>(null);

export function useAppLock() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppLock must be used inside <AppLockProvider>');
  return v;
}

async function authenticate(prompt: string) {
  const r = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: false,
  });
  return r.success;
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [enabled, setEnabledState] = useState(false);
  const [available, setAvailable] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      const [hw, enrolled, stored] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(KEY).catch(() => null),
      ]);
      const ok = hw && enrolled;
      setAvailable(ok);
      const on = stored === '1' && ok;
      setEnabledState(on);
      setLocked(on); // lock on cold start
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') backgroundedAt.current = Date.now();
      if (
        s === 'active' &&
        enabled &&
        backgroundedAt.current &&
        Date.now() - backgroundedAt.current > RELOCK_AFTER_MS
      ) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [enabled]);

  const unlock = useCallback(async () => {
    if (await authenticate('Unlock PaiPai')) setLocked(false);
  }, []);

  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  const setEnabled = useCallback(async (v: boolean) => {
    // Confirm with biometrics before turning the lock on or off.
    if (!(await authenticate(v ? 'Turn on app lock' : 'Turn off app lock'))) return false;
    await SecureStore.setItemAsync(KEY, v ? '1' : '0');
    setEnabledState(v);
    return true;
  }, []);

  return (
    <Ctx.Provider value={{ enabled, available, setEnabled }}>
      {children}
      {ready && locked && (
        <View
          accessibilityViewIsModal
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
          }}
        >
          <LogoMark size={48} />
          <Text weight="semibold" className="mt-6 text-[22px] tracking-tight">
            PaiPai is locked
          </Text>
          <Text muted className="mt-2 text-center">
            Unlock with your fingerprint, face or device passcode.
          </Text>
          <Button
            title="Unlock"
            size="lg"
            className="mt-8 w-full"
            icon={<Fingerprint size={18} color={colors.primaryForeground} />}
            onPress={() => void unlock()}
          />
        </View>
      )}
    </Ctx.Provider>
  );
}
