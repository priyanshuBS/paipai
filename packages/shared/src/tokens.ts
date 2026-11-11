/**
 * PaiPai design tokens. Single source of truth for colours, radii, spacing and
 * typography, consumed by the Tailwind (web) and NativeWind (mobile) configs.
 */

export const palette = {
  lime: '#B6E36B',
  limeLight: '#E4F5C8',
  forest: '#1E3A1A',
  forestMid: '#2F5D2A',
  white: '#FFFFFF',
  black: '#111111',
  grey: '#6B7280',
  expense: '#E5484D',
  income: '#2E9E5B',
  warning: '#F5A524',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  accentSoft: string;
  expense: string;
  income: string;
  warning: string;
}

export const lightColors: ThemeColors = {
  background: '#F7F8F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F2EC',
  border: '#E6E9E1',
  text: '#111111',
  textSecondary: '#6B7280',
  primary: palette.forest,
  primaryForeground: '#FFFFFF',
  accent: palette.lime,
  accentForeground: palette.forest,
  accentSoft: palette.limeLight,
  expense: palette.expense,
  income: palette.income,
  warning: palette.warning,
};

export const darkColors: ThemeColors = {
  background: '#0F140E',
  surface: '#1A2118',
  surfaceMuted: '#232B20',
  border: '#2A3327',
  text: '#F3F4F0',
  textSecondary: '#A3A9A0',
  primary: palette.lime,
  primaryForeground: palette.forest,
  accent: palette.lime,
  accentForeground: palette.forest,
  accentSoft: '#2A3A1F',
  expense: '#F2555A',
  income: '#3FBF73',
  warning: palette.warning,
};

/** Soft pastel colours used for categories (dot indicators + icon backgrounds). */
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
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
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
  balance: { size: 40, weight: '600' },
  h1: { size: 28, weight: '700' },
  h2: { size: 22, weight: '700' },
  h3: { size: 18, weight: '600' },
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
