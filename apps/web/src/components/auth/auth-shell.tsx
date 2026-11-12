import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Logo } from '@/components/brand';

const points = [
  'Log an expense in a few seconds, on web or phone',
  'See where your money goes by category, item and day',
  'Budgets that warn you before you overspend',
];

/** Quiet brand panel on desktop, compact header on phones. */
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
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between border-r border-border bg-background p-10 lg:flex">
        <Link href="/" aria-label="PaiPai home" className="w-fit">
          <Logo />
        </Link>
        <div className="max-w-sm">
          <p className="text-sm font-medium text-accent">Paai-paai ka hisaab</p>
          <p className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
            Every rupee accounted for.
          </p>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-sm text-muted-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          No bank connection needed. Your data is never sold or shared.
        </p>
      </aside>
      <main className="flex flex-col bg-surface px-4 py-6 sm:px-8">
        <Link href="/" className="w-fit lg:hidden" aria-label="PaiPai home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-1.5 text-sm text-muted-foreground">{subtitle}</div>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
