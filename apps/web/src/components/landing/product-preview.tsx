import { ChartColumn, FileText, House, ListOrdered, Plus, Repeat, Target } from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { CategoryIcon } from '@/components/category-icon';
import { cn } from '@/lib/utils';

/**
 * Static, non-interactive rendering of the real dashboard, used on the landing
 * page instead of a stock phone mockup. Built from the same tokens and pieces.
 */

const recent = [
  {
    title: 'Auto fare',
    meta: 'Today · 9:15 am',
    cat: 'Travel',
    icon: 'bus',
    color: '#7CC4FA',
    amt: '−₹30',
  },
  {
    title: 'Milk',
    meta: 'Today · 7:40 am',
    cat: 'Groceries',
    icon: 'shopping-basket',
    color: '#9BE3A8',
    amt: '−₹56',
  },
  {
    title: 'Lunch',
    meta: 'Yesterday · 1:10 pm',
    cat: 'Food & Dining',
    icon: 'utensils',
    color: '#FFB38A',
    amt: '−₹180',
  },
  {
    title: 'Salary',
    meta: '1 Nov · 10:00 am',
    cat: 'Salary',
    icon: 'briefcase',
    color: '#B9A6F7',
    amt: '+₹45,000',
    income: true,
  },
];

// Smooth-ish daily spend curve for the month (viewBox 0..300 x 0..80).
const LINE =
  'M0,62 C15,60 25,48 40,50 S65,64 80,58 S105,30 120,34 S145,56 160,52 S185,40 200,44 S225,20 240,24 S270,46 300,38';

const nav = [
  { label: 'Overview', icon: House, active: true },
  { label: 'Transactions', icon: ListOrdered },
  { label: 'Analytics', icon: ChartColumn },
  { label: 'Budgets', icon: Target },
  { label: 'Recurring', icon: Repeat },
  { label: 'Reports', icon: FileText },
];

export function ProductPreview({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="PaiPai dashboard: ₹12,480 spent this month, recent transactions and budget progress"
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-pop)]',
        className,
      )}
    >
      {/* Window chrome */}
      <div aria-hidden className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="mx-auto rounded-md bg-surface-muted px-3 py-0.5 text-[11px] text-muted-foreground">
          paipai.priyanshusingh.co.in
        </span>
      </div>

      <div aria-hidden className="flex text-left">
        {/* Sidebar */}
        <div className="hidden w-48 shrink-0 flex-col gap-0.5 border-r border-border bg-background p-3 md:flex">
          <div className="mb-3 flex items-center gap-2 px-2 py-1">
            <LogoMark className="size-5 text-foreground" title="" />
            <span className="text-sm font-semibold">PaiPai</span>
          </div>
          <div className="mb-3 flex h-8 items-center gap-2 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground">
            <Plus className="size-3.5" /> Add expense
          </div>
          {nav.map((n) => (
            <div
              key={n.label}
              className={cn(
                'flex h-8 items-center gap-2 rounded-md px-2.5 text-xs',
                n.active
                  ? 'bg-surface font-medium text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground',
              )}
            >
              <n.icon className="size-3.5" /> {n.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 bg-background p-4 sm:p-6">
          <p className="text-base font-semibold tracking-tight">Good morning, Priya</p>
          <p className="text-xs text-muted-foreground">Thursday, 12 November</p>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">Spent in November</p>
              <p className="tabular mt-0.5 text-2xl font-semibold tracking-tight">₹12,480</p>
              <svg viewBox="0 0 300 80" className="mt-2 h-16 w-full" preserveAspectRatio="none">
                <path d={`${LINE} L300,80 L0,80 Z`} className="fill-accent/10" />
                <path
                  d={LINE}
                  className="stroke-accent"
                  fill="none"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Income</p>
                  <p className="tabular text-sm font-medium text-income">₹45,000</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Net balance</p>
                  <p className="tabular text-sm font-medium">₹32,520</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-semibold">Monthly budget</p>
                  <p className="tabular text-[11px] text-muted-foreground">62%</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-surface-muted">
                  <div className="h-full w-[62%] rounded-full bg-accent" />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  ₹7,520 left · 18 days to go
                </p>
              </div>
              <div className="hidden rounded-lg border border-border bg-surface sm:block">
                {[
                  ['Today', '₹86'],
                  ['This week', '₹2,140'],
                  ['This month', '₹12,480'],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    className="flex justify-between border-b border-border px-4 py-2 text-xs last:border-0"
                  >
                    <span className="text-muted-foreground">{l}</span>
                    <span className="tabular font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-border bg-surface p-2">
            <p className="px-2 pb-1 pt-1 text-xs font-semibold">Recent activity</p>
            {recent.map((r) => (
              <div key={r.title} className="flex items-center gap-3 rounded-md px-2 py-2">
                <CategoryIcon icon={r.icon} color={r.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{r.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{r.meta}</p>
                </div>
                <div className="text-right">
                  <p className={cn('tabular text-xs font-medium', r.income && 'text-income')}>
                    {r.amt}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{r.cat}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
