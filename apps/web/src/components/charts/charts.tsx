'use client';

import { useTheme } from 'next-themes';
import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { Table2, ChartColumn } from 'lucide-react';
import { formatMoney } from '@paipai/shared/money';
import { chartColorFor, chartPalette, darkColors, lightColors } from '@paipai/shared/tokens';
import { Card } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export interface ChartPoint {
  /** Stable key (e.g. bucket date) */
  key: string;
  /** Axis label */
  label: string;
  /** Long label for tooltips / tables */
  fullLabel?: string;
  value: number;
  count?: number;
}

/** Literal colours per mode (SVG presentation attributes can't resolve CSS vars). */
export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  const c = dark ? darkColors : lightColors;
  return {
    dark,
    mode: (dark ? 'dark' : 'light') as 'light' | 'dark',
    surface: c.surface,
    grid: c.border,
    axis: c.textSecondary,
    text: c.text,
    /** Single-series colour: the accent. Other bars recede to a neutral. */
    line: c.brand,
    fill: c.brand,
    bar: c.chartMuted,
    barActive: c.brand,
    neutral: chartPalette.neutral[dark ? 'dark' : 'light'],
  };
}

const compactINR = (v: number) => formatMoney(v, { compact: true });

const tooltipClass =
  'rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-[var(--shadow-pop)]';

function TooltipPill({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const p = payload?.[0];
  if (!active || !p) return null;
  const point = p.payload as ChartPoint;
  return (
    <div className={tooltipClass}>
      <p className="text-muted-foreground">{point.fullLabel ?? point.label}</p>
      <p className="tabular mt-0.5 font-medium text-foreground">
        {formatMoney(Number(p.value))}
        {point.count !== undefined && (
          <span className="ml-1 font-normal text-muted-foreground">· {point.count}×</span>
        )}
      </p>
    </div>
  );
}

/** Card with a chart/table toggle, so data is never colour- or hover-only. */
export function ChartCard({
  title,
  subtitle,
  action,
  table,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  table?: { columns: string[]; rows: (string | number)[][] };
  children: ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className={cn('min-w-0', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-1">
          {action}
          {table && (
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              aria-pressed={asTable}
              aria-label={asTable ? `Show ${title} as chart` : `Show ${title} as table`}
              className="-mr-1.5 -mt-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              {asTable ? <ChartColumn className="size-4" /> : <Table2 className="size-4" />}
            </button>
          )}
        </div>
      </div>
      {asTable && table ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                {table.columns.map((c, i) => (
                  <th key={c} scope="col" className={cn('pb-2 font-medium', i > 0 && 'text-right')}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {r.map((cell, j) => (
                    <td key={j} className={cn('py-2', j > 0 && 'tabular text-right')}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

/** Area chart: 2px accent line over a faint accent wash. */
export function SpendAreaChart({ data, height = 220 }: { data: ChartPoint[]; height?: number }) {
  const t = useChartTheme();
  const gid = useId().replace(/:/g, '');
  const peak = data.reduce((m, p, i) => (p.value > (data[m]?.value ?? -1) ? i : m), 0);
  return (
    <div
      style={{ height }}
      role="img"
      aria-label={`Spending over time, peak ${formatMoney(data[peak]?.value ?? 0)} on ${data[peak]?.fullLabel ?? data[peak]?.label ?? ''}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.fill} stopOpacity={t.dark ? 0.3 : 0.22} />
              <stop offset="100%" stopColor={t.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: t.axis, fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickFormatter={compactINR}
            tickLine={false}
            axisLine={false}
            tick={{ fill: t.axis, fontSize: 12 }}
            width={56}
          />
          <Tooltip
            content={<TooltipPill />}
            cursor={{ stroke: t.axis, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={t.line}
            strokeWidth={2}
            fill={`url(#fill-${gid})`}
            activeDot={{ r: 4, fill: t.line, stroke: t.surface, strokeWidth: 2 }}
            dot={(props: { cx?: number; cy?: number; index?: number }) =>
              props.index === peak && data.length > 1 ? (
                <circle
                  key="peak"
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill={t.line}
                  stroke={t.surface}
                  strokeWidth={2}
                />
              ) : (
                <g key={props.index} />
              )
            }
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical bars; the highlighted bar (selected/peak/today) takes the accent, the rest stay neutral. */
export function SpendBarChart({
  data,
  highlightKey,
  height = 200,
  showYAxis = false,
}: {
  data: ChartPoint[];
  highlightKey?: string;
  height?: number;
  showYAxis?: boolean;
}) {
  const t = useChartTheme();
  const [hover, setHover] = useState<number | null>(null);
  const peakKey =
    highlightKey ??
    data.reduce((m, p) => (p.value > m.value ? p : m), data[0] ?? { key: '', value: -1 }).key;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
          barCategoryGap="22%"
          onMouseLeave={() => setHover(null)}
        >
          {showYAxis && <CartesianGrid vertical={false} stroke={t.grid} />}
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: t.axis, fontSize: 12 }}
            interval={0}
          />
          {showYAxis && (
            <YAxis
              tickFormatter={compactINR}
              tickLine={false}
              axisLine={false}
              tick={{ fill: t.axis, fontSize: 12 }}
              width={56}
            />
          )}
          <Tooltip content={<TooltipPill />} cursor={{ fill: t.grid, opacity: 0.35, radius: 4 }} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            minPointSize={3}
            onMouseEnter={(_, i) => setHover(i)}
            isAnimationActive
          >
            {data.map((p, i) => (
              <Cell key={p.key} fill={p.key === peakKey || hover === i ? t.barActive : t.bar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface DonutSlice {
  id: string;
  name: string;
  value: number;
  percent: number;
  /** The category's own (pastel) colour; mapped to a validated chart colour. */
  color: string | null;
}

/** Top-5 + "Other" donut with 2px surface gaps and a centre total. */
export function CategoryDonut({
  slices,
  total,
  height = 220,
}: {
  slices: DonutSlice[];
  total: number;
  height?: number;
}) {
  const t = useChartTheme();
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="70%"
            outerRadius="94%"
            paddingAngle={slices.length > 1 ? 2 : 0}
            cornerRadius={2}
            stroke={t.surface}
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
          >
            {slices.map((s) => (
              <Cell
                key={s.id}
                fill={s.id === 'other' ? t.neutral : chartColorFor(s.color, t.mode)}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              const p = payload?.[0];
              if (!active || !p) return null;
              const s = p.payload as DonutSlice;
              return (
                <div className={tooltipClass}>
                  <p className="text-muted-foreground">{s.name}</p>
                  <p className="tabular mt-0.5 font-medium text-foreground">
                    {formatMoney(s.value)}{' '}
                    <span className="font-normal text-muted-foreground">· {s.percent}%</span>
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="tabular text-lg font-semibold">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

/** Horizontal share bars (payment methods) – plain HTML, fully labelled. */
export function ShareBars({
  rows,
}: {
  rows: { key: string; label: string; value: number; percent: number; count?: number }[];
}) {
  const t = useChartTheme();
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between text-sm">
            <span>{r.label}</span>
            <span className="tabular text-muted-foreground">
              <span className="font-medium text-foreground">{formatMoney(r.value)}</span> ·{' '}
              {r.percent}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-surface-muted" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(r.percent, 2)}%`,
                background: t.line,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
