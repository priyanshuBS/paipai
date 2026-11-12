import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Logo } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sparkline } from '@/components/charts/mini';

const points = [
  'Log an expense in a few seconds, on web or phone',
  'See where your money goes by category, item and day',
  'Budgets that warn you before you overspend',
];

const trend = [220, 180, 410, 260, 300, 520, 240, 380, 290, 610, 330, 420, 300, 480, 390, 700];

/** Midnight brand panel on desktop, compact header on phones. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-hero p-10 text-hero-foreground lg:flex">
        <div aria-hidden className="ledger-grid absolute inset-0" />
        <div aria-hidden className="saffron-glow absolute inset-0" />
        <Link href="/" aria-label="PaiPai home" className="relative w-fit">
          <Logo className="text-hero-foreground" />
        </Link>

        <div className="relative max-w-md">
          <p className="font-display text-[3.25rem] leading-[1.02] tracking-[-0.02em]">
            Every rupee,
            <br />
            <em className="text-brand">accounted for.</em>
          </p>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-sm text-hero-muted">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-2xl border border-hero-border bg-hero-surface/80 p-5 backdrop-blur">
            <p className="text-xs text-hero-muted">Spent in November</p>
            <p className="tabular mt-1 text-3xl font-semibold tracking-tight">₹12,480</p>
            <Sparkline values={trend} className="mt-3 h-14" label="" />
          </div>
        </div>

        <p className="relative text-xs text-hero-muted">
          No bank connection needed. Your data is never sold or shared.
        </p>
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="w-fit lg:invisible" aria-label="PaiPai home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-[2.6rem] leading-[1.05] tracking-[-0.01em]">{title}</h1>
          <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
