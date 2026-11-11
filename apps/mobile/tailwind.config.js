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
        lime: v('lime'),
        'lime-light': v('lime-light'),
        forest: v('forest'),
        'forest-mid': v('forest-mid'),
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        'inter-extrabold': ['Inter_800ExtraBold'],
      },
      borderRadius: { card: '22px' },
    },
  },
  plugins: [],
};
