import { Bus, Coffee, Eye, ShoppingBasket, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-[270px] shrink-0 rounded-[44px] border-[10px] border-forest bg-[#F7F8F5] p-4 shadow-[0_40px_80px_-30px_rgb(30_58_26/0.55)]',
        className,
      )}
    >
      <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-forest" />
      {children}
    </div>
  );
}

const rows = [
  {
    icon: Bus,
    bg: '#7CC4FA',
    title: 'Auto fare',
    sub: 'Motihari to Khartari · 9:15 am',
    amt: '−₹30',
  },
  { icon: ShoppingBasket, bg: '#9BE3A8', title: 'Milk', sub: 'Today · 7:40 am', amt: '−₹56' },
  { icon: Utensils, bg: '#FFB38A', title: 'Lunch', sub: 'Yesterday · 1:10 pm', amt: '−₹180' },
  { icon: Coffee, bg: '#FFD66B', title: 'Chai', sub: 'Yesterday · 5:30 pm', amt: '−₹20' },
];

/** Static, illustrative dashboard screen (marketing only). */
export function DashboardMock({ className }: { className?: string }) {
  return (
    <PhoneFrame className={className}>
      <p className="text-[11px] text-[#6B7280]">Welcome back!</p>
      <p className="text-base font-bold text-[#111]">Hi, Priya</p>
      <div className="mt-3 rounded-[22px] bg-forest p-4 text-white">
        <div className="flex items-center justify-between text-[11px] text-white/70">
          <span>Spent this month</span>
          <Eye className="size-3.5" aria-hidden />
        </div>
        <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums">₹12,480</p>
        <div className="mt-3 flex gap-3 text-[10px]">
          <span className="rounded-full bg-white/10 px-2 py-1">Income ₹45,000</span>
          <span className="rounded-full bg-lime px-2 py-1 font-semibold text-forest">
            Net ₹32,520
          </span>
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-white p-3">
        <div className="flex justify-between text-[10px] text-[#6B7280]">
          <span>Budget</span>
          <span>62%</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-[#E4F5C8]">
          <div className="h-2 w-[62%] rounded-full bg-forest-mid" />
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#111]">Recent Activity</p>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.title} className="flex items-center gap-2.5 rounded-2xl bg-white p-2">
            <span
              className="flex size-8 items-center justify-center rounded-full text-forest"
              style={{ background: r.bg }}
            >
              <r.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-[#111]">
                {r.title}
              </span>
              <span className="block truncate text-[9px] text-[#6B7280]">{r.sub}</span>
            </span>
            <span className="text-[11px] font-semibold text-[#E5484D]">{r.amt}</span>
          </li>
        ))}
      </ul>
    </PhoneFrame>
  );
}

const week = [40, 65, 30, 85, 55, 70, 45];

/** Static, illustrative analytics screen (marketing only). */
export function AnalyticsMock({ className }: { className?: string }) {
  return (
    <PhoneFrame className={className}>
      <p className="text-base font-bold text-[#111]">Analytics</p>
      <div className="mt-2 flex gap-1 rounded-full bg-[#EEF0EA] p-1 text-[10px] font-semibold">
        {['Day', 'Week', 'Month', 'Year'].map((p) => (
          <span
            key={p}
            className={cn(
              'flex-1 rounded-full py-1 text-center',
              p === 'Week' ? 'bg-white text-[#111]' : 'text-[#6B7280]',
            )}
          >
            {p}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[#6B7280]">Total spent</p>
      <p className="text-2xl font-semibold tabular-nums text-[#111]">₹3,240</p>
      <p className="text-[10px] font-semibold text-[#2E9E5B]">↓ 4.8% from last week</p>
      <div className="mt-3 flex h-28 items-end justify-between gap-1.5 rounded-2xl bg-white p-3">
        {week.map((h, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div
              className={cn('w-full rounded-md', i === 3 ? 'bg-forest' : 'bg-lime')}
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] text-[#6B7280]">{'MTWTFSS'[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 rounded-2xl bg-white p-3 text-[11px]">
        {[
          ['Travel', '#2a78d6', '₹1,240', '38%'],
          ['Food & Dining', '#eb6834', '₹980', '30%'],
          ['Groceries', '#1baf7a', '₹620', '19%'],
        ].map(([n, c, a, p]) => (
          <div key={n} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: c }} />
            <span className="flex-1 text-[#111]">{n}</span>
            <span className="font-semibold text-[#111]">{a}</span>
            <span className="w-8 text-right text-[#6B7280]">{p}</span>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
}
