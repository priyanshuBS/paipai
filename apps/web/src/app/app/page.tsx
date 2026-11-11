'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChartColumn,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Target,
} from 'lucide-react';
import {
  DEFAULT_TIMEZONE,
  formatDayHeader,
  formatMonthLabel,
  formatTime,
} from '@paipai/shared/date';
import { formatINR } from '@paipai/shared/money';
import { PageHeader } from '@/components/app/app-shell';
import { useQuickAdd } from '@/components/app/quick-add-context';
import { TransactionRow, TransactionRowSkeleton } from '@/components/app/transaction-row';
import { EmptyState } from '@/components/empty-state';
import { CountUp } from '@/components/money';
import { Button, IconPill, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, ErrorState, Skeleton } from '@/components/ui/primitives';
import { useCategoryMap, useMe, useRecentTransactions, useSummary } from '@/lib/queries';
import { cn, firstName } from '@/lib/utils';

const HIDE_KEY = 'paipai:hide-balance';

function useHiddenBalance(): [boolean, () => void] {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDE_KEY) === '1');
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggle = () =>
    setHidden((h) => {
      try {
        localStorage.setItem(HIDE_KEY, h ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !h;
    });
  return [hidden, toggle];
}

function greetingFor(tz: string) {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: tz }).format(
      new Date(),
    ),
  );
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function BudgetProgress({ spent, budget }: { spent: number; budget: number | null }) {
  if (!budget) {
    return (
      <Card className="flex items-center gap-4">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-forest dark:text-lime">
          <Target className="size-5" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="font-semibold">Set a monthly budget</p>
          <p className="text-sm text-muted-foreground">
            PaiPai will warn you before you overspend.
          </p>
        </div>
        <Button asChild variant="soft" size="sm">
          <Link href="/app/welcome">Set budget</Link>
        </Button>
      </Card>
    );
  }
  const pct = Math.round((spent / budget) * 100);
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  const bar =
    state === 'over'
      ? 'bg-expense'
      : state === 'warn'
        ? 'bg-warning'
        : 'bg-forest-mid dark:bg-lime';
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">Monthly budget</p>
        <p className="text-sm text-muted-foreground">
          <span className="tabular font-semibold text-foreground">{formatINR(spent)}</span> of{' '}
          {formatINR(budget)}
        </p>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-accent-soft dark:bg-surface-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(pct, 100)}
        aria-label={`Budget used: ${pct}%`}
      >
        <div
          className={cn('h-full rounded-full transition-all', bar)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p
        className={cn(
          'mt-2 text-sm',
          state === 'over'
            ? 'text-expense'
            : state === 'warn'
              ? 'text-warning'
              : 'text-muted-foreground',
        )}
      >
        {state === 'over'
          ? `You're ${formatINR(spent - budget)} over budget this month.`
          : state === 'warn'
            ? `Heads up: ${pct}% used, ${formatINR(budget - spent)} left.`
            : `${formatINR(budget - spent)} left · ${pct}% used`}
      </p>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const summary = useSummary({ period: 'month', type: 'expense' });
  const recent = useRecentTransactions(6);
  const categories = useCategoryMap();
  const { openAdd } = useQuickAdd();
  const [hidden, toggleHidden] = useHiddenBalance();
  const s = summary.data;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={me ? `Hi, ${firstName(me.name)}` : <Skeleton className="h-8 w-40" />}
        subtitle={me ? `${greetingFor(tz)} · Welcome back!` : 'Welcome back!'}
      />

      <div className="grid grid-cols-1 gap-4 px-4 pt-4 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Balance card */}
        <section
          aria-label="This month"
          className="relative overflow-hidden rounded-[var(--radius-card)] bg-forest p-6 text-white shadow-[var(--shadow-float)]"
        >
          <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-lime/15" />
          <div className="relative flex items-center justify-between">
            <p className="text-sm text-white/70">Spent in {formatMonthLabel(new Date(), tz)}</p>
            <button
              type="button"
              onClick={toggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
              className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
            >
              {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {s ? (
            <CountUp
              value={s.totalExpense}
              hidden={hidden}
              className="relative block text-[40px] font-semibold leading-tight sm:text-[44px]"
            />
          ) : (
            <Skeleton className="h-12 w-48 bg-white/10" />
          )}
          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="flex items-center gap-1 text-xs text-white/70">
                <ArrowDownLeft className="size-3.5" aria-hidden /> Income
              </p>
              <p className="tabular mt-1 font-semibold">
                {s ? (hidden ? '•••••' : formatINR(s.totalIncome)) : '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-lime p-3 text-forest">
              <p className="flex items-center gap-1 text-xs text-forest/70">
                {s && s.net < 0 ? (
                  <Minus className="size-3.5" aria-hidden />
                ) : (
                  <ArrowUpRight className="size-3.5" aria-hidden />
                )}{' '}
                Net balance
              </p>
              <p className="tabular mt-1 font-semibold">
                {s ? (hidden ? '•••••' : formatINR(s.net)) : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Today / week / month */}
        <section aria-label="Spending so far" className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {[
            { label: 'Today', value: s?.today },
            { label: 'This week', value: s?.thisWeek },
            { label: 'This month', value: s?.thisMonth },
          ].map((x) => (
            <Card
              key={x.label}
              className="flex flex-col justify-center p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <p className="text-xs text-muted-foreground lg:text-sm">{x.label}</p>
              {x.value === undefined ? (
                <Skeleton className="mt-1 h-6 w-16" />
              ) : (
                <p className="tabular mt-1 text-lg font-semibold lg:mt-0">
                  {hidden ? '•••' : formatINR(x.value)}
                </p>
              )}
            </Card>
          ))}
        </section>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 overflow-x-auto px-4 py-5 sm:px-8">
        <IconPill icon={<Plus />} onClick={() => openAdd('expense')}>
          Add Expense
        </IconPill>
        <IconPill icon={<ArrowDownLeft />} onClick={() => openAdd('income')}>
          Add Income
        </IconPill>
        <Link
          href="/app/analytics"
          className={cn(buttonVariants({ variant: 'secondary' }), 'pl-1.5')}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-forest text-lime">
            <ChartColumn />
          </span>
          Analytics
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        <Card className="min-w-0 p-3 sm:p-4">
          <div className="px-2 pt-1">
            <CardHeader
              title="Recent Activity"
              action={
                <Link
                  href="/app/transactions"
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-forest-mid hover:underline dark:text-lime"
                >
                  See Details <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            />
          </div>
          {recent.isError ? (
            <ErrorState onRetry={() => void recent.refetch()} />
          ) : recent.isLoading ? (
            <ul>
              {Array.from({ length: 5 }, (_, i) => (
                <TransactionRowSkeleton key={i} />
              ))}
            </ul>
          ) : recent.data?.items.length ? (
            <ul className="space-y-0.5">
              {recent.data.items.map((t) => (
                <TransactionRow
                  key={t.id}
                  t={t}
                  tz={tz}
                  category={t.categoryId ? categories.get(t.categoryId) : undefined}
                  timeLabel={`${formatDayHeader(t.occurredAt, tz)} · ${formatTime(t.occurredAt, tz)}`}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No expenses yet — add your first one!"
              description="Tap Add Expense or press N. It takes about 5 seconds."
              action={
                <Button onClick={() => openAdd('expense')}>
                  <Plus /> Add expense
                </Button>
              }
            />
          )}
        </Card>
        <div>
          <BudgetProgress spent={s?.thisMonth ?? 0} budget={me?.monthlyBudget ?? null} />
        </div>
      </div>
    </div>
  );
}
