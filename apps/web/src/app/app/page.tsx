'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  DEFAULT_TIMEZONE,
  dayKey,
  formatDayHeader,
  formatMonthLabel,
  formatTime,
  monthKey,
} from '@paipai/shared/date';
import { formatMoney } from '@paipai/shared/money';
import { chartColorFor } from '@paipai/shared/tokens';
import { PageHeader } from '@/components/app/app-shell';
import { useQuickAdd } from '@/components/app/quick-add-context';
import { TransactionRow, TransactionRowSkeleton } from '@/components/app/transaction-row';
import { CategoryIcon } from '@/components/category-icon';
import { useChartTheme } from '@/components/charts/charts';
import { Ring, Sparkline } from '@/components/charts/mini';
import { EmptyState } from '@/components/empty-state';
import { CountUp } from '@/components/money';
import { Button } from '@/components/ui/button';
import { Card, ErrorState, Skeleton } from '@/components/ui/primitives';
import {
  useBudgets,
  useCategoryBreakdown,
  useCategoryMap,
  useMe,
  useRecentTransactions,
  useSummary,
  useTimeseries,
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

function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

function ViewLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
    >
      {children} <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

/** The midnight ledger: this month's spend, its trend and the key numbers. */
function HeroCard({ tz, hidden, onToggle }: { tz: string; hidden: boolean; onToggle: () => void }) {
  const summary = useSummary({ period: 'month', type: 'expense' });
  const now = new Date();
  const series = useTimeseries({
    granularity: 'day',
    from: `${monthKey(now, tz)}-01`,
    to: dayKey(now, tz),
    type: 'expense',
  });
  const s = summary.data;
  const values = (series.data ?? []).map((p) => p.total);
  const change = s?.changePercent ?? null;
  const less = change !== null && change <= 0;

  return (
    <section
      aria-label="This month"
      className="relative overflow-hidden rounded-[22px] bg-hero p-6 text-hero-foreground shadow-[0_24px_48px_-24px_rgb(11_16_32/.55)] sm:p-7"
    >
      <div aria-hidden className="ledger-grid absolute inset-0" />
      <div aria-hidden className="saffron-glow absolute inset-0" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-hero-muted">Spent in {formatMonthLabel(now, tz)}</p>
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={hidden}
            aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
            className="-mr-1.5 flex size-9 items-center justify-center rounded-full text-hero-muted transition-colors hover:bg-hero-surface hover:text-hero-foreground"
          >
            {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
          {s ? (
            <CountUp
              value={s.totalExpense}
              hidden={hidden}
              className="block text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[48px]"
            />
          ) : (
            <Skeleton className="h-12 w-52 bg-hero-surface" />
          )}
          {change !== null && (
            <span
              className={cn(
                'mb-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                less ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300',
              )}
            >
              {less ? (
                <TrendingDown className="size-3.5" aria-hidden />
              ) : (
                <TrendingUp className="size-3.5" aria-hidden />
              )}
              {Math.abs(change)}% {less ? 'less' : 'more'} than last month
            </span>
          )}
        </div>

        <div className="mt-6 h-28">
          {values.length > 1 ? (
            <Sparkline
              values={values}
              className="h-full"
              label={`Daily spending this month, latest ${formatMoney(values.at(-1) ?? 0)}`}
            />
          ) : (
            <div className="flex h-full items-end">
              <div className="h-px w-full bg-hero-border" />
            </div>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-hero-border pt-5">
          {[
            { label: 'Income', value: s?.totalIncome, cls: 'text-emerald-300' },
            { label: 'Net balance', value: s?.net, cls: '' },
            { label: 'Today', value: s?.today, cls: '' },
          ].map((x) => (
            <div key={x.label} className="min-w-0">
              <dt className="text-xs text-hero-muted">{x.label}</dt>
              <dd className={cn('tabular mt-1 truncate text-[15px] font-medium', x.cls)}>
                {x.value === undefined ? '—' : hidden ? '••••' : formatMoney(x.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** Top categories this month as coloured bars. */
function WhereItWent() {
  const { data, isLoading } = useCategoryBreakdown({ period: 'month', type: 'expense' });
  const t = useChartTheme();
  const rows = (data ?? []).slice(0, 5);
  return (
    <Card className="flex flex-col">
      <SectionTitle action={<ViewLink href="/app/analytics">Analytics</ViewLink>}>
        Where it went
      </SectionTitle>
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Your top categories will show up here.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((c) => (
            <li key={c.categoryId ?? 'none'} className="flex items-center gap-3">
              <CategoryIcon icon={c.icon} color={c.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="tabular shrink-0 font-medium">{formatMoney(c.total)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(c.percent, 2)}%`,
                      background: chartColorFor(c.color, t.mode),
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function BudgetCard({ spent, budget }: { spent: number; budget: number | null }) {
  const { data } = useBudgets();
  const flagged = (data ?? []).filter((b) => b.categoryId && b.status !== 'ok');

  // Category alerts show whether or not an overall monthly budget exists.
  const alerts = flagged.length > 0 && (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="mb-3 text-sm font-semibold">Budget alerts</h3>
      <ul className="space-y-3">
        {flagged.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  b.status === 'over' ? 'bg-expense' : 'bg-warning',
                )}
              />
              <span className="truncate">{b.categoryName}</span>
            </span>
            <span
              className={cn(
                'tabular shrink-0 font-medium',
                b.status === 'over' ? 'text-expense' : 'text-warning',
              )}
            >
              {b.status === 'over' ? `Over by ${formatMoney(-b.remaining)}` : `${b.percent}% used`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (!budget) {
    return (
      <Card>
        <SectionTitle>Monthly budget</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Set a budget and PaiPai warns you at 80% and again at 100%.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link href="/app/budgets">Set a budget</Link>
        </Button>
        {alerts}
      </Card>
    );
  }
  const pct = Math.round((spent / budget) * 100);
  const state = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return (
    <Card>
      <SectionTitle action={<ViewLink href="/app/budgets">Budgets</ViewLink>}>
        Monthly budget
      </SectionTitle>
      <div className="flex items-center gap-5">
        <Ring percent={pct} tone={state}>
          <span className="tabular text-lg font-semibold leading-none">{pct}%</span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            used
          </span>
        </Ring>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            <span className="tabular font-medium text-foreground">{formatMoney(spent)}</span> of{' '}
            <span className="tabular">{formatMoney(budget)}</span>
          </p>
          <p
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(pct, 100)}
            aria-label={`Budget used: ${pct}%`}
            className={cn(
              'mt-1 text-sm',
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
        </div>
      </div>
      {alerts}
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
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: tz,
      }).format(new Date()),
    [tz],
  );

  return (
    <div>
      <PageHeader
        title={me ? `${greetingFor(tz)}, ${firstName(me.name)}` : <Skeleton className="h-9 w-64" />}
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

      <div className="grid grid-cols-1 gap-5 px-4 pt-5 sm:px-8 lg:grid-cols-[1.65fr_1fr]">
        <HeroCard tz={tz} hidden={hidden} onToggle={toggleHidden} />
        <WhereItWent />
      </div>

      <div className="grid grid-cols-1 gap-5 px-4 pt-5 sm:px-8 lg:grid-cols-[1.65fr_1fr]">
        <Card className="min-w-0 p-0">
          <div className="px-5 pt-5">
            <SectionTitle action={<ViewLink href="/app/transactions">View all</ViewLink>}>
              Recent activity
            </SectionTitle>
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
        <div className="space-y-5">
          <BudgetCard spent={s?.thisMonth ?? 0} budget={me?.monthlyBudget ?? null} />
          <Card>
            <SectionTitle>So far</SectionTitle>
            <dl className="grid grid-cols-2 gap-4">
              {[
                { label: 'This week', value: s?.thisWeek },
                { label: 'This month', value: s?.thisMonth },
              ].map((x) => (
                <div key={x.label}>
                  <dt className="text-xs text-muted-foreground">{x.label}</dt>
                  <dd className="tabular mt-1 text-lg font-semibold tracking-tight">
                    {x.value === undefined ? '—' : hidden ? '•••' : formatMoney(x.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
