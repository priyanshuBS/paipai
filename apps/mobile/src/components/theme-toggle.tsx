import * as Haptics from 'expo-haptics';
import { Moon, Sun } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useTheme } from '@/theme/theme';

/**
 * One-tap light/dark toggle for the screens before sign-in (onboarding,
 * login, sign-up, code). Shows a moon in light mode and a sun in dark mode.
 */
export function ThemeToggle({ onHero = false }: { onHero?: boolean }) {
  const { dark, setPreference, colors } = useTheme();
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  const color = onHero ? colors.heroText : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        void Haptics.selectionAsync();
        setPreference(dark ? 'light' : 'dark');
      }}
      className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
    >
      {dark ? <Sun size={20} color={color} /> : <Moon size={20} color={color} />}
    </Pressable>
  );
}
