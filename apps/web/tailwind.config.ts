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
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
      },
      spacing: { 13: '3.25rem' },
      borderRadius: { card: '16px' },
      letterSpacing: { tightest: '-0.03em' },
    },
  },
  plugins: [],
};

export default config;
