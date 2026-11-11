import type { Config } from 'tailwindcss';

/** Colours resolve to CSS variables emitted from @paipai/shared tokens (see ThemeVars). */
const v = (name: string) => `rgb(var(--pp-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
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
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: { 13: '3.25rem' },
      borderRadius: { card: '22px' },
    },
  },
  plugins: [],
};

export default config;
