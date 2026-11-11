import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand';

/** Lime brand panel on desktop, compact header on phones. */
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
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-lime p-12 text-forest lg:flex">
        <Link href="/" aria-label="PaiPai home">
          <Logo className="text-forest dark:text-forest" />
        </Link>
        <div>
          <p className="text-5xl font-extrabold leading-tight tracking-tight">
            Paai-paai
            <br />
            ka hisaab.
          </p>
          <p className="mt-4 max-w-sm text-lg text-forest/80">Every rupee, tracked in seconds.</p>
        </div>
        <div
          aria-hidden
          className="absolute -bottom-24 -right-24 size-96 rounded-full bg-lime-light/60"
        />
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" className="lg:hidden" aria-label="PaiPai home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <div className="mt-2 text-muted-foreground">{subtitle}</div>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
