/**
 * PaiPai design tokens. Single source of truth for colours, radii, spacing and
 * typography, consumed by the Tailwind (web) and NativeWind (mobile) configs.
 *
 * Direction: neutral and quiet. Zinc surfaces with hairline borders, ink for
 * primary actions, one cobalt accent (links, focus, selection, main chart
 * series). Green only means income; red only means over-budget or errors.
 */

export const palette = {
  ink: '#18181B',
  white: '#FFFFFF',
  cobalt: '#2E5BDA',
  cobaltLight: '#7C9CF5',
  expense: '#DC2626',
  income: '#15803D',
  warning: '#B45309',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  /** Stronger border for inputs and hover states. */
  borderStrong: string;
  text: string;
  textSecondary: string;
  /** Primary action (buttons): ink in light mode, near-white in dark mode. */
  primary: string;
  primaryForeground: string;
  /** The single accent: links, focus rings, selected states, main chart series. */
  accent: string;
  accentForeground: string;
  accentSoft: string;
  /** Negative / danger (over budget, errors, destructive). Not used for ordinary expenses. */
  expense: string;
  income: string;
  warning: string;
  /** Neutral fill for chart bars that aren't highlighted. */
  chartMuted: string;
}

export const lightColors: ThemeColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F4F5',
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',
  text: '#09090B',
  textSecondary: '#71717A',
  primary: palette.ink,
  primaryForeground: '#FAFAFA',
  accent: palette.cobalt,
  accentForeground: '#FFFFFF',
  accentSoft: '#EEF2FC',
  expense: palette.expense,
  income: palette.income,
  warning: palette.warning,
  chartMuted: '#E4E4E7',
};

export const darkColors: ThemeColors = {
  background: '#09090B',
  surface: '#111113',
  surfaceMuted: '#1C1C1F',
  border: '#27272A',
  borderStrong: '#3F3F46',
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  primary: '#FAFAFA',
  primaryForeground: '#09090B',
  accent: palette.cobaltLight,
  accentForeground: '#09090B',
  accentSoft: '#172038',
  expense: '#F87171',
  income: '#4ADE80',
  warning: '#FBBF24',
  chartMuted: '#27272A',
};

/** Category identity colours (stored per category). Rendered through chartColorFor() so they stay legible. */
export const categoryColors = [
  '#7CC4FA', // sky
  '#FFB38A', // peach
  '#9BE3A8', // mint
  '#F7A8D8', // pink
  '#FFD66B', // butter
  '#B9A6F7', // lavender
  '#7EDCD0', // teal
  '#F59E9E', // coral
  '#A8D5FF', // baby blue
  '#C8E68A', // pistachio
  '#FFC4A3', // apricot
  '#D3B8F2', // lilac
  '#F2C185', // sand
  '#BFC7D5', // slate
] as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

export const typography = {
  fontFamily: 'Inter',
  balance: { size: 34, weight: '600' },
  h1: { size: 24, weight: '600' },
  h2: { size: 18, weight: '600' },
  h3: { size: 16, weight: '600' },
  body: { size: 15, weight: '400' },
  caption: { size: 12, weight: '400' },
} as const;

/** Minimum tap target size (accessibility). */
export const MIN_TAP_TARGET = 44;

export const brand = {
  name: 'PaiPai',
  tagline: 'Paai-paai ka hisaab',
  scheme: 'paipai',
} as const;

/**
 * Validated 8-slot categorical palette for chart fills (the soft category
 * pastels are too light to carry data on their own). Same hues, stepped per mode.
 */
export const chartPalette = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  /** "Other" / uncategorised */
  neutral: { light: '#9ca3af', dark: '#6b7280' },
} as const;

/** Hue (degrees) of each chart slot, for nearest-hue mapping. */
const CHART_SLOT_HUES = [212, 17, 158, 40, 337, 120, 248, 0] as const;

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

/**
 * Chart colour for a category: the validated slot nearest in hue to the
 * category's own (pastel) colour, so a category keeps the same chart colour
 * in every view regardless of its rank. Greys map to the neutral.
 */
export function chartColorFor(
  categoryHex: string | null | undefined,
  mode: 'light' | 'dark' = 'light',
): string {
  if (!categoryHex || !/^#[0-9a-f]{6}$/i.test(categoryHex)) return chartPalette.neutral[mode];
  const { h, s } = hexToHsl(categoryHex);
  if (s < 0.25) return chartPalette.neutral[mode];
  let best = 0;
  let bestDist = Infinity;
  CHART_SLOT_HUES.forEach((slotHue, i) => {
    const dist = Math.min(Math.abs(h - slotHue), 360 - Math.abs(h - slotHue));
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return chartPalette[mode][best] ?? chartPalette.neutral[mode];
}
