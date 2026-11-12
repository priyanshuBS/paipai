'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { DropdownMenu } from 'radix-ui';
import { useTheme } from 'next-themes';
import {
  ChartColumn,
  FileText,
  House,
  ListOrdered,
  LogOut,
  MonitorSmartphone,
  Moon,
  Plus,
  Repeat,
  Settings,
  Sun,
  Target,
} from 'lucide-react';
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { setDisplayCurrency } from '@paipai/shared/money';
import type { ThemePreference } from '@paipai/shared/schemas';
import { toast } from 'sonner';
import { Logo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { useMe, useUpdateMe } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { QuickAddProvider, useQuickAdd } from './quick-add-context';

const nav = [
  { href: '/app', label: 'Home', icon: House },
  { href: '/app/transactions', label: 'Transactions', icon: ListOrdered },
  { href: '/app/analytics', label: 'Analytics', icon: ChartColumn },
  { href: '/app/budgets', label: 'Budgets', icon: Target },
  { href: '/app/recurring', label: 'Recurring', icon: Repeat },
  { href: '/app/reports', label: 'Reports', icon: FileText },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

/** Apply the account's currency and theme (synced across devices). */
function usePreferenceSync() {
  const { data: me } = useMe();
  const { theme, setTheme } = useTheme();
  const applied = useRef(false);
  if (me) setDisplayCurrency(me.currency);
  useEffect(() => {
    if (me && !applied.current) {
      applied.current = true;
      if (me.theme !== theme) setTheme(me.theme);
    }
  }, [me, theme, setTheme]);
  return me?.currency ?? 'INR';
}

function isActive(pathname: string, href: string) {
  return href === '/app' ? pathname === '/app' : pathname.startsWith(href);
}

function Avatar({
  name,
  image,
  className,
}: {
  name?: string;
  image?: string | null;
  className?: string;
}) {
  const initials = (name ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt=""
      referrerPolicy="no-referrer"
      className={cn('size-10 rounded-full object-cover', className)}
    />
  ) : (
    <span
      className={cn(
        'flex size-10 items-center justify-center rounded-full border border-border bg-surface-muted text-xs font-semibold text-muted-foreground',
        className,
      )}
    >
      {initials}
    </span>
  );
}

function UserMenu({ compact }: { compact?: boolean }) {
  const { data: me } = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const updateMe = useUpdateMe();
  const pathname = usePathname();
  const changeTheme = (v: string) => {
    setTheme(v);
    updateMe.mutate({ theme: v as ThemePreference });
  };

  async function signOut(all: boolean) {
    if (all) {
      const { error } = await authClient.revokeSessions();
      if (error) {
        toast.error(error.message ?? 'Could not log out from all devices');
        return;
      }
    }
    await authClient.signOut();
    qc.clear();
    router.replace('/login');
    if (all) toast.success('Logged out from all devices');
  }

  const item =
    'flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm outline-none data-[highlighted]:bg-surface-muted [&>svg]:text-muted-foreground';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className={cn(
          'flex items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-surface-muted',
          compact ? '' : 'w-full',
        )}
      >
        <Avatar name={me?.name} image={me?.image} className={compact ? 'size-8' : 'size-8'} />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{me?.name ?? '…'}</span>
            <span className="block truncate text-xs text-muted-foreground">{me?.email}</span>
          </span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-pop)]"
        >
          <DropdownMenu.Label className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            Theme
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme ?? 'system'} onValueChange={changeTheme}>
            {[
              { v: 'light', l: 'Light', i: Sun },
              { v: 'dark', l: 'Dark', i: Moon },
              { v: 'system', l: 'System', i: MonitorSmartphone },
            ].map(({ v, l, i: I }) => (
              <DropdownMenu.RadioItem
                key={v}
                value={v}
                className={cn(item, 'data-[state=checked]:font-medium')}
              >
                <I className="size-4" aria-hidden /> {l}
                <DropdownMenu.ItemIndicator className="ml-auto size-1.5 rounded-full bg-accent" />
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {/* Extra pages for the compact (mobile web) layout */}
          <div className="lg:hidden">
            {nav.slice(3).map((n) => (
              <DropdownMenu.Item
                key={n.href}
                asChild
                className={cn(item, pathname.startsWith(n.href) && 'font-medium')}
              >
                <Link href={n.href}>
                  <n.icon className="size-4" aria-hidden /> {n.label}
                </Link>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
          </div>
          <DropdownMenu.Item className={item} onSelect={() => void signOut(false)}>
            <LogOut className="size-4" aria-hidden /> Log out
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={cn(item, 'text-expense')}
            onSelect={() => void signOut(true)}
          >
            <MonitorSmartphone className="size-4" aria-hidden /> Log out from all devices
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { openAdd } = useQuickAdd();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-background px-3 py-4 lg:flex">
      <Link href="/app" className="px-2 py-1" aria-label="PaiPai home">
        <Logo />
      </Link>
      <Button className="mt-5 w-full justify-start" onClick={() => openAdd('expense')}>
        <Plus /> Add expense
        <kbd className="ml-auto rounded border border-primary-foreground/20 px-1.5 font-sans text-[11px] font-medium text-primary-foreground/70">
          N
        </kbd>
      </Button>
      <nav className="mt-5 flex flex-col gap-0.5" aria-label="App">
        {nav.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-surface text-foreground shadow-sm ring-1 ring-border [&>svg]:text-foreground'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )}
            >
              <n.icon className="size-4" aria-hidden /> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border pt-3">
        <UserMenu />
      </div>
    </aside>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { openAdd } = useQuickAdd();
  const items = [...nav.slice(0, 2), null, ...nav.slice(2, 3)];
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-around px-2">
        {items.map((n, i) =>
          n ? (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={isActive(pathname, n.href) ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 text-[11px] font-medium',
                  isActive(pathname, n.href) ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <n.icon className="size-5" aria-hidden />
                {n.label}
                <span
                  className={cn(
                    'size-1 rounded-full',
                    isActive(pathname, n.href) ? 'bg-accent' : 'bg-transparent',
                  )}
                />
              </Link>
            </li>
          ) : (
            <li key={`add-${i}`}>
              <button
                type="button"
                onClick={() => openAdd('expense')}
                aria-label="Add expense"
                className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground active:opacity-90"
              >
                <Plus className="size-5" strokeWidth={2} aria-hidden />
              </button>
            </li>
          ),
        )}
        <li>
          <span className="flex min-h-14 min-w-14 items-center justify-center">
            <UserMenu compact />
          </span>
        </li>
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const currency = usePreferenceSync();
  return (
    <QuickAddProvider>
      <div className="flex min-h-dvh">
        <Sidebar />
        {/* Remount on currency change so every amount re-formats. */}
        <Fragment key={currency}>
          <div className="min-w-0 flex-1 pb-28 lg:pb-12">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </div>
        </Fragment>
      </div>
      <BottomNav />
    </QuickAddProvider>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-4 pb-2 pt-6 sm:px-8 sm:pt-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
