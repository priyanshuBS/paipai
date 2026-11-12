'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * One-tap light/dark toggle for public pages (landing, login, sign-up).
 * Shows a moon in light mode and a sun in dark mode.
 */
export function ThemeToggle({
  onHero = false,
  className,
}: {
  /** Styling for the midnight hero surfaces. */
  onHero?: boolean;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known on the client; render a stable placeholder until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-9 items-center justify-center rounded-full transition-colors',
        onHero
          ? 'text-hero-muted hover:bg-hero-surface hover:text-hero-foreground'
          : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
        className,
      )}
    >
      {dark ? (
        <Sun className="size-[18px]" aria-hidden />
      ) : (
        <Moon className="size-[18px]" aria-hidden />
      )}
    </button>
  );
}
