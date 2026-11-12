// Colours are CSS variables set at runtime from @paipai/shared tokens
// (see src/theme/theme-provider.tsx), so light/dark switch in one place.
const v = (name) => `rgb(var(--pp-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: v('background'),
        surface: v('surface'),
        'surface-muted': v('surface-muted'),
        border: v('border'),
        foreground: v('text'),
        'muted-foreground': v('text-secondary'),
        primary: v('primary'),
        'primary-foreground': v('primary-foreground'),
        accent: v('accent'),
        'accent-foreground': v('accent-foreground'),
        'accent-soft': v('accent-soft'),
        expense: v('expense'),
        income: v('income'),
        warning: v('warning'),
        'border-strong': v('border-strong'),
        'chart-muted': v('chart-muted'),
        brand: v('brand'),
        'brand-foreground': v('brand-foreground'),
        hero: v('hero'),
        'hero-surface': v('hero-surface'),
        'hero-border': v('hero-border'),
        'hero-foreground': v('hero-text'),
        'hero-muted': v('hero-muted'),
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        'inter-extrabold': ['Inter_800ExtraBold'],
        display: ['InstrumentSerif_400Regular'],
        'display-italic': ['InstrumentSerif_400Regular_Italic'],
      },
      borderRadius: { card: '18px' },
    },
  },
  plugins: [],
};
