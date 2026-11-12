'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0]?.[0] ?? 0},${pts[0]?.[1] ?? 0}`;
  let d = `M${pts[0]?.[0]},${pts[0]?.[1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) continue;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Area sparkline in the brand colour, for the hero card. Purely decorative
 * summary of a series that is also available as numbers elsewhere.
 */
export function Sparkline({
  values,
  className,
  label,
}: {
  values: number[];
  className?: string;
  label: string;
}) {
  const gid = useId().replace(/:/g, '');
  const W = 600;
  const H = 120;
  const pad = 6;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const pts: [number, number][] = values.map((v, i) => [
    i * step,
    H - pad - (v / max) * (H - pad * 2),
  ]);
  const line = smoothPath(pts);
  const last = pts.at(-1);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn('w-full overflow-visible', className)}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--pp-brand))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--pp-brand))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {values.length > 1 && (
        <>
          <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#spark-${gid})`} />
          <path
            d={line}
            fill="none"
            stroke="rgb(var(--pp-brand))"
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      {last && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r="4.5"
          fill="rgb(var(--pp-brand))"
          stroke="rgb(var(--pp-hero))"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/** Circular progress ring (budget used). */
export function Ring({
  percent,
  tone,
  size = 88,
  stroke = 8,
  children,
}: {
  percent: number;
  tone: 'ok' | 'warn' | 'over';
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const color =
    tone === 'over'
      ? 'rgb(var(--pp-expense))'
      : tone === 'warn'
        ? 'rgb(var(--pp-warning))'
        : 'rgb(var(--pp-brand))';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--pp-surface-muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
