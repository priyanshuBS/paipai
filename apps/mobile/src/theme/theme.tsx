import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, vars } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { darkColors, lightColors, palette, type ThemeColors } from '@paipai/shared/tokens';

export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'paipai:theme';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const channels = (hex: string) => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const brand = {
  lime: palette.lime,
  limeLight: palette.limeLight,
  forest: palette.forest,
  forestMid: palette.forestMid,
};

/** CSS variables (RGB channels) derived from the shared design tokens. */
function toVars(colors: ThemeColors) {
  const entries = Object.entries({ ...brand, ...colors }).map(([k, v]) => [
    `--pp-${kebab(k)}`,
    channels(v),
  ]);
  return vars(Object.fromEntries(entries));
}

const LIGHT_VARS = toVars(lightColors);
const DARK_VARS = toVars(darkColors);

interface ThemeCtx {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  dark: boolean;
  /** Literal colours for SVG/icons, which can't read Tailwind classes. */
  colors: ThemeColors & typeof brand;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') {
          setPref(v);
          setColorScheme(v);
        }
      })
      .catch(() => undefined);
  }, [setColorScheme]);

  const value = useMemo<ThemeCtx>(() => {
    const dark = colorScheme === 'dark';
    return {
      preference,
      dark,
      colors: { ...brand, ...(dark ? darkColors : lightColors) },
      setPreference: (p) => {
        setPref(p);
        setColorScheme(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => undefined);
      },
    };
  }, [colorScheme, preference, setColorScheme]);

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
