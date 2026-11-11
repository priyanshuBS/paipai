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
import { formatINR } from '@paipai/shared/money';
import {
  chartColorFor,
  chartPalette,
  darkColors,
  lightColors,
  palette,
} from '@paipai/shared/tokens';
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
    line: dark ? palette.lime : palette.forestMid,
    fill: palette.lime,
    bar: dark ? palette.forestMid : palette.lime,
    barActive: dark ? palette.lime : palette.forest,
    tooltipBg: dark ? palette.lime : '#111111',
    tooltipText: dark ? palette.forest : '#FFFFFF',
    neutral: chartPalette.neutral[dark ? 'dark' : 'light'],
  };
}

const compactINR = (v: number) => formatINR(v, { compact: true });

function TooltipPill({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const t = useChartTheme();
  const p = payload?.[0];
  if (!active || !p) return null;
  const point = p.payload as ChartPoint;
  return (
    <div
      className="rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg"
      style={{ background: t.tooltipBg, color: t.tooltipText }}
    >
      <span className="opacity-75">{point.fullLabel ?? point.label}</span>
      <span className="ml-2 tabular-nums">{formatINR(Number(p.value))}</span>
      {point.count !== undefined && <span className="ml-1 opacity-75">· {point.count}×</span>}
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
          <h2 className="font-semibold">{title}</h2>
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
              className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted"
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

/** Smooth area chart with a lime gradient fading to transparent. */
export function SpendAreaChart({ data, height = 220 }: { data: ChartPoint[]; height?: number }) {
  const t = useChartTheme();
  const gid = useId().replace(/:/g, '');
  const peak = data.reduce((m, p, i) => (p.value > (data[m]?.value ?? -1) ? i : m), 0);
  return (
    <div
      style={{ height }}
      role="img"
      aria-label={`Spending over time, peak ${formatINR(data[peak]?.value ?? 0)} on ${data[peak]?.fullLabel ?? data[peak]?.label ?? ''}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.fill} stopOpacity={t.dark ? 0.35 : 0.65} />
              <stop offset="100%" stopColor={t.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 6" />
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
            cursor={{ stroke: t.line, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={t.line}
            strokeWidth={2}
            fill={`url(#fill-${gid})`}
            activeDot={{ r: 6, fill: t.barActive, stroke: t.surface, strokeWidth: 2 }}
            dot={(props: { cx?: number; cy?: number; index?: number }) =>
              props.index === peak && data.length > 1 ? (
                <circle
                  key="peak"
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill={t.barActive}
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

/** Vertical bars; the highlighted bar (selected/peak/today) is dark green. */
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
          {showYAxis && <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 6" />}
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
          <Tooltip content={<TooltipPill />} cursor={{ fill: t.grid, opacity: 0.4, radius: 8 }} />
          <Bar
            dataKey="value"
            radius={[4, 4, 4, 4]}
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
            innerRadius="64%"
            outerRadius="92%"
            paddingAngle={slices.length > 1 ? 2 : 0}
            cornerRadius={4}
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
                <div
                  className="rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg"
                  style={{ background: t.tooltipBg, color: t.tooltipText }}
                >
                  {s.name} <span className="ml-1 tabular-nums">{formatINR(s.value)}</span>{' '}
                  <span className="opacity-75">· {s.percent}%</span>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="tabular text-lg font-semibold">{formatINR(total)}</span>
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
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{r.label}</span>
            <span className="tabular text-muted-foreground">
              <span className="font-semibold text-foreground">{formatINR(r.value)}</span> ·{' '}
              {r.percent}%
            </span>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-surface-muted" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(r.percent, 2)}%`,
                background: i === 0 ? t.barActive : t.line,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
