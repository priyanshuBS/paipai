/**
 * PaiPai design tokens. Single source of truth for colours, radii, spacing and
 * typography, consumed by the Tailwind (web) and NativeWind (mobile) configs.
 *
 * Direction, "midnight ledger": a warm paper canvas, midnight-navy ink and hero
 * surfaces, and one saffron brand accent. Green only means income; red only
 * means over-budget or errors; yellow only means "getting close".
 */

export const palette = {
  ink: '#0B1020',
  white: '#FFFFFF',
  /** Brand saffron, for fills, highlights and the main chart series. */
  saffron: '#F26B1D',
  /** Darker saffron that passes AA as text on white. */
  saffronDeep: '#C2410C',
  expense: '#DC2626',
  income: '#15803D',
  warning: '#A16207',
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
  /** Primary action (buttons): midnight ink in light mode, paper in dark mode. */
  primary: string;
  primaryForeground: string;
  /** Text-safe brand colour: links, focus rings, selected states. */
  accent: string;
  accentForeground: string;
  accentSoft: string;
  /** Brand saffron fill: highlights, chart series, the add button. */
  brand: string;
  brandForeground: string;
  /** Negative / danger (over budget, errors, destructive). Not used for ordinary expenses. */
  expense: string;
  income: string;
  warning: string;
  /** Neutral fill for chart bars that aren't highlighted. */
  chartMuted: string;
  /** The midnight "ledger" surfaces (hero cards, sidebar), same in both themes. */
  hero: string;
  heroSurface: string;
  heroBorder: string;
  heroText: string;
  heroMuted: string;
  /** App sidebar (web): light in light mode, the midnight hero in dark mode. */
  sidebar: string;
  sidebarForeground: string;
  sidebarMuted: string;
  sidebarBorder: string;
  sidebarActive: string;
}

const hero = {
  hero: '#0B1020',
  heroSurface: '#151C36',
  heroBorder: '#252E50',
  heroText: '#F7F6F3',
  heroMuted: '#9AA1B9',
};

export const lightColors: ThemeColors = {
  background: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceMuted: '#EFECE5',
  border: '#E4DFD5',
  borderStrong: '#D3CDC1',
  text: '#0B1020',
  textSecondary: '#6B6A72',
  primary: palette.ink,
  primaryForeground: '#FFFFFF',
  accent: palette.saffronDeep,
  accentForeground: '#FFFFFF',
  accentSoft: '#FDEEE3',
  brand: palette.saffron,
  brandForeground: palette.ink,
  expense: palette.expense,
  income: palette.income,
  warning: palette.warning,
  chartMuted: '#E8E4DB',
  ...hero,
  sidebar: '#FFFFFF',
  sidebarForeground: palette.ink,
  sidebarMuted: '#6B6A72',
  sidebarBorder: '#E4DFD5',
  sidebarActive: '#FDEEE3',
};

export const darkColors: ThemeColors = {
  background: '#070A14',
  surface: '#0E1324',
  surfaceMuted: '#161C31',
  border: '#212945',
  borderStrong: '#323C5E',
  text: '#F4F3EF',
  textSecondary: '#9A9DAD',
  primary: '#F4F3EF',
  primaryForeground: palette.ink,
  accent: '#FF9A57',
  accentForeground: palette.ink,
  accentSoft: '#2B1B12',
  brand: '#FF8A3D',
  brandForeground: palette.ink,
  expense: '#F87171',
  income: '#4ADE80',
  warning: '#FACC15',
  chartMuted: '#212945',
  ...hero,
  hero: '#10162C',
  heroSurface: '#1A2242',
  sidebar: '#10162C',
  sidebarForeground: hero.heroText,
  sidebarMuted: hero.heroMuted,
  sidebarBorder: hero.heroBorder,
  sidebarActive: '#1A2242',
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
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
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
  /** Editorial serif for headlines and hero titles (never for amounts: no ₹ glyph). */
  displayFamily: 'Instrument Serif',
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
