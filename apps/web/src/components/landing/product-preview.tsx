import { ChartColumn, FileText, House, ListOrdered, Plus, Repeat, Target } from 'lucide-react';
import { chartColorFor } from '@paipai/shared/tokens';
import { CategoryIcon } from '@/components/category-icon';
import { Logo } from '@/components/brand';
import { Ring, Sparkline } from '@/components/charts/mini';
import { cn } from '@/lib/utils';

/**
 * Static rendering of the real dashboard for the landing page, built from the
 * same components and tokens as the app (not a stock mockup).
 */

const trend = [
  220, 180, 410, 260, 300, 520, 240, 380, 290, 610, 330, 420, 300, 260, 480, 350, 390, 700, 420,
  380,
];

const cats = [
  { name: 'Food & Dining', icon: 'utensils', color: '#FFB38A', amount: '₹4,120', pct: 33 },
  { name: 'Travel', icon: 'bus', color: '#7CC4FA', amount: '₹2,860', pct: 23 },
  { name: 'Groceries', icon: 'shopping-basket', color: '#9BE3A8', amount: '₹2,240', pct: 18 },
  { name: 'Bills & Utilities', icon: 'receipt', color: '#FFD66B', amount: '₹1,780', pct: 14 },
];

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

const nav = [
  { label: 'Home', icon: House, active: true },
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
      aria-label="PaiPai dashboard: ₹12,480 spent this month, a daily trend, top categories, budget progress and recent transactions"
      className={cn(
        'overflow-hidden rounded-2xl border border-hero-border/60 bg-surface shadow-[0_40px_80px_-30px_rgb(11_16_32/.55)] ring-1 ring-black/5',
        className,
      )}
    >
      <div aria-hidden className="flex text-left">
        {/* Sidebar */}
        <div className="saffron-glow-soft hidden w-48 shrink-0 flex-col gap-0.5 bg-hero p-3 md:flex">
          <Logo
            className="mb-4 px-2 py-1 text-hero-foreground [&>span]:text-sm"
            markClassName="size-5"
          />
          <div className="mb-4 flex h-8 items-center gap-2 rounded-lg bg-brand px-2.5 text-xs font-medium text-brand-foreground">
            <Plus className="size-3.5" /> Add expense
          </div>
          {nav.map((n) => (
            <div
              key={n.label}
              className={cn(
                'relative flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs',
                n.active
                  ? 'bg-hero-surface font-medium text-hero-foreground before:absolute before:inset-y-2 before:left-0 before:w-[2px] before:rounded-full before:bg-brand'
                  : 'text-hero-muted',
              )}
            >
              <n.icon className={cn('size-3.5', n.active && 'text-brand')} /> {n.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 bg-background p-4 sm:p-6">
          <p className="font-display text-2xl leading-none">Good morning, Priya</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Thursday, 12 November</p>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-xl bg-hero p-4 text-hero-foreground">
              <div className="ledger-grid absolute inset-0" />
              <div className="saffron-glow absolute inset-0" />
              <div className="relative">
                <p className="text-[11px] text-hero-muted">Spent in November</p>
                <div className="mt-0.5 flex items-end gap-2">
                  <p className="tabular text-2xl font-semibold tracking-tight">₹12,480</p>
                  <span className="mb-0.5 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                    ↓ 8% less than last month
                  </span>
                </div>
                <Sparkline values={trend} className="mt-3 h-14" label="" />
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-hero-border pt-3">
                  {[
                    ['Income', '₹45,000', 'text-emerald-300'],
                    ['Net balance', '₹32,520', ''],
                    ['Today', '₹86', ''],
                  ].map(([l, v, c]) => (
                    <div key={l}>
                      <p className="text-[10px] text-hero-muted">{l}</p>
                      <p className={cn('tabular text-xs font-medium', c)}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Where it went */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold">Where it went</p>
              <div className="mt-3 space-y-3">
                {cats.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" className="size-7" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="truncate">{c.name}</span>
                        <span className="tabular font-medium">{c.amount}</span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${c.pct * 2.4}%`, background: chartColorFor(c.color) }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-xl border border-border bg-surface p-2 shadow-[var(--shadow-card)]">
              <p className="px-2 pb-1 pt-1.5 text-xs font-semibold">Recent activity</p>
              {recent.map((r) => (
                <div key={r.title} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                  <CategoryIcon icon={r.icon} color={r.color} size="sm" className="size-7" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{r.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{r.meta}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('tabular text-xs font-medium', r.income && 'text-income')}>
                      {r.amt}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{r.cat}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:block">
              <p className="text-xs font-semibold">Monthly budget</p>
              <div className="mt-3 flex items-center gap-3">
                <Ring percent={62} tone="ok" size={64} stroke={6}>
                  <span className="tabular text-xs font-semibold">62%</span>
                </Ring>
                <div className="text-[11px] text-muted-foreground">
                  <p>
                    <span className="tabular font-medium text-foreground">₹12,480</span> of ₹20,000
                  </p>
                  <p className="mt-0.5">₹7,520 left · 18 days to go</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
