'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowRight, Eye, EyeOff, Plus, Target } from 'lucide-react';
import {
  DEFAULT_TIMEZONE,
  formatDayHeader,
  formatMonthLabel,
  formatTime,
} from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import { PageHeader } from '@/components/app/app-shell';
import { useQuickAdd } from '@/components/app/quick-add-context';
import { TransactionRow, TransactionRowSkeleton } from '@/components/app/transaction-row';
import { EmptyState } from '@/components/empty-state';
import { CountUp } from '@/components/money';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, ErrorState, Skeleton } from '@/components/ui/primitives';
import {
  useBudgets,
  useCategoryMap,
  useMe,
  useRecentTransactions,
  useSummary,
} from '@/lib/queries';
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

function ProgressBar({
  pct,
  tone,
  label,
}: {
  pct: number;
  tone: 'ok' | 'warn' | 'over';
  label: string;
}) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(pct, 100)}
      aria-label={label}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500',
          tone === 'over' ? 'bg-expense' : tone === 'warn' ? 'bg-warning' : 'bg-accent',
        )}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function BudgetProgress({ spent, budget }: { spent: number; budget: number | null }) {
  if (!budget) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium">Set a monthly budget</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Get a heads-up before you overspend.
            </p>
            <Button asChild variant="secondary" size="sm" className="mt-3">
              <Link href="/app/budgets">Set budget</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }
  const pct = Math.round((spent / budget) * 100);
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Monthly budget</p>
        <p className="text-sm text-muted-foreground">
          <span className="tabular font-medium text-foreground">{formatMoney(spent)}</span> of{' '}
          <span className="tabular">{formatMoney(budget)}</span>
        </p>
      </div>
      <div className="mt-3">
        <ProgressBar pct={pct} tone={state} label={`Budget used: ${pct}%`} />
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
          ? `You're ${formatMoney(spent - budget)} over budget this month.`
          : state === 'warn'
            ? `Heads up: ${pct}% used, ${formatMoney(budget - spent)} left.`
            : `${formatMoney(budget - spent)} left · ${pct}% used`}
      </p>
    </Card>
  );
}

/** Category budgets that are near or over their limit. */
function CategoryBudgetAlerts() {
  const { data } = useBudgets();
  const flagged = (data ?? []).filter((b) => b.categoryId && b.status !== 'ok');
  if (flagged.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title="Budget alerts"
        action={
          <Link href="/app/budgets" className="text-sm font-medium text-accent hover:underline">
            Manage
          </Link>
        }
      />
      <ul className="space-y-4">
        {flagged.map((b) => (
          <li key={b.id}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>{b.categoryName}</span>
              <span
                className={cn(
                  'tabular font-medium',
                  b.status === 'over' ? 'text-expense' : 'text-warning',
                )}
              >
                {b.status === 'over'
                  ? `Over by ${formatMoney(-b.remaining)}`
                  : `${b.percent}% used`}
              </span>
            </div>
            <ProgressBar
              pct={b.percent}
              tone={b.status === 'over' ? 'over' : 'warn'}
              label={`${b.categoryName}: ${b.percent}% used`}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Stat({
  label,
  value,
  hidden,
  tone,
}: {
  label: string;
  value: number | undefined;
  hidden: boolean;
  tone?: 'income';
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-1.5 h-5 w-20" />
      ) : (
        <p
          className={cn(
            'tabular mt-1 truncate text-[15px] font-medium',
            tone === 'income' && 'text-income',
          )}
        >
          {hidden ? '••••' : formatMoney(value)}
        </p>
      )}
    </div>
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
  const today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: tz,
  }).format(new Date());

  return (
    <div>
      <PageHeader
        title={me ? `${greetingFor(tz)}, ${firstName(me.name)}` : <Skeleton className="h-7 w-56" />}
        subtitle={today}
        action={
          <div className="hidden gap-2 sm:flex">
            <Button variant="secondary" onClick={() => openAdd('income')}>
              <ArrowDownLeft /> Add income
            </Button>
            <Button onClick={() => openAdd('expense')}>
              <Plus /> Add expense
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 px-4 pt-4 sm:px-8 lg:grid-cols-[1.6fr_1fr]">
        {/* This month */}
        <Card aria-label="This month" className="flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Spent in {formatMonthLabel(new Date(), tz)}
            </p>
            <button
              type="button"
              onClick={toggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
              className="-mr-1.5 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {s ? (
            <CountUp
              value={s.totalExpense}
              hidden={hidden}
              className="mt-1 block text-[32px] font-semibold leading-tight tracking-tight sm:text-[36px]"
            />
          ) : (
            <Skeleton className="mt-2 h-10 w-44" />
          )}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 lg:mt-auto">
            <Stat label="Income" value={s?.totalIncome} hidden={hidden} tone="income" />
            <Stat label="Net balance" value={s?.net} hidden={hidden} />
          </div>
        </Card>

        {/* Today / week / month */}
        <Card aria-label="Spending so far" className="p-0">
          <p className="px-5 pb-1 pt-4 text-sm font-semibold">Spending so far</p>
          <dl className="divide-y divide-border">
            {[
              { label: 'Today', value: s?.today },
              { label: 'This week', value: s?.thisWeek },
              { label: 'This month', value: s?.thisMonth },
            ].map((x) => (
              <div key={x.label} className="flex items-center justify-between px-5 py-3">
                <dt className="text-sm text-muted-foreground">{x.label}</dt>
                <dd>
                  {x.value === undefined ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <span className="tabular text-sm font-medium">
                      {hidden ? '•••' : formatMoney(x.value)}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 pt-4 sm:px-8 lg:grid-cols-[1.6fr_1fr]">
        <Card className="min-w-0 p-0">
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <Link
              href="/app/transactions"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              View all <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="px-2 pb-2">
            {recent.isError ? (
              <ErrorState onRetry={() => void recent.refetch()} />
            ) : recent.isLoading ? (
              <ul>
                {Array.from({ length: 5 }, (_, i) => (
                  <TransactionRowSkeleton key={i} />
                ))}
              </ul>
            ) : recent.data?.items.length ? (
              <ul>
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
                description="Press N anywhere or use Add expense. It takes about five seconds."
                action={
                  <Button onClick={() => openAdd('expense')}>
                    <Plus /> Add expense
                  </Button>
                }
              />
            )}
          </div>
        </Card>
        <div className="space-y-4">
          <BudgetProgress spent={s?.thisMonth ?? 0} budget={me?.monthlyBudget ?? null} />
          <CategoryBudgetAlerts />
        </div>
      </div>
    </div>
  );
}
