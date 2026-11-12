import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, vars } from 'nativewind';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from '@paipai/shared/tokens';

export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'paipai:theme';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const channels = (hex: string) => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** CSS variables (RGB channels) derived from the shared design tokens. */
function toVars(colors: ThemeColors) {
  const entries = Object.entries(colors).map(([k, v]) => [`--pp-${kebab(k)}`, channels(v)]);
  return vars(Object.fromEntries(entries));
}

const LIGHT_VARS = toVars(lightColors);
const DARK_VARS = toVars(darkColors);

interface ThemeCtx {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  dark: boolean;
  /** Literal colours for SVG/icons, which can't read Tailwind classes. */
  colors: ThemeColors;
}

const Ctx = createContext<ThemeCtx | null>(null);

const isPreference = (v: unknown): v is ThemePreference =>
  v === 'light' || v === 'dark' || v === 'system';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  // null until the saved preference has been read (the splash screen is still up).
  const [preference, setPref] = useState<ThemePreference | null>(null);
  const prefRef = useRef(preference);
  prefRef.current = preference;

  // Apply the saved theme BEFORE rendering the app. Changing the colour scheme
  // after screens have started mounting fires appearance events at half-mounted
  // components ("state update on a component that hasn't mounted yet") and
  // forces a full re-render of the navigator during its first layout pass.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .catch(() => null)
      .then((v) => {
        if (!alive) return;
        const p = isPreference(v) ? v : 'system';
        if (p !== 'system') setColorScheme(p); // "system" is already the default
        setPref(p);
      });
    return () => {
      alive = false;
    };
  }, [setColorScheme]);

  // Stable, and a no-op when nothing changes, so callers (e.g. the account
  // theme sync) can never start an update loop.
  const setPreference = useCallback(
    (p: ThemePreference) => {
      if (prefRef.current === p) return;
      prefRef.current = p;
      setPref(p);
      setColorScheme(p);
      AsyncStorage.setItem(STORAGE_KEY, p).catch(() => undefined);
    },
    [setColorScheme],
  );

  const value = useMemo<ThemeCtx>(() => {
    const dark = colorScheme === 'dark';
    return {
      preference: preference ?? 'system',
      dark,
      colors: dark ? darkColors : lightColors,
      setPreference,
    };
  }, [colorScheme, preference, setPreference]);

  if (preference === null) return null;

  return (
    <Ctx.Provider value={value}>
      <View style={[{ flex: 1 }, value.dark ? DARK_VARS : LIGHT_VARS]}>{children}</View>
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>');
  return v;
}
