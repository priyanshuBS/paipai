/** Pure chart geometry helpers (unit-tested). */

export interface Pt {
  x: number;
  y: number;
}

/**
 * Smooth path through points using monotone cubic interpolation
 * (Fritsch–Carlson), so the curve never overshoots below zero.
 */
export function monotonePath(points: Pt[]): string {
  const n = points.length;
  if (n === 0) return '';
  const p0 = points[0] as Pt;
  if (n === 1) return `M${p0.x},${p0.y}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = points[i] as Pt;
    const b = points[i + 1] as Pt;
    dx.push(b.x - a.x);
    slope.push((b.y - a.y) / (b.x - a.x || 1));
  }
  const m: number[] = [slope[0] ?? 0];
  for (let i = 1; i < n - 1; i++) {
    const s0 = slope[i - 1] ?? 0;
    const s1 = slope[i] ?? 0;
    m.push(s0 * s1 <= 0 ? 0 : (s0 + s1) / 2);
  }
  m.push(slope[n - 2] ?? 0);
  for (let i = 0; i < n - 1; i++) {
    const s = slope[i] ?? 0;
    if (s === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = (m[i] ?? 0) / s;
    const b = (m[i + 1] ?? 0) / s;
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * s;
      m[i + 1] = t * b * s;
    }
  }
  let d = `M${p0.x},${p0.y}`;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i] as Pt;
    const b = points[i + 1] as Pt;
    const h = (dx[i] ?? 0) / 3;
    d += ` C${a.x + h},${a.y + (m[i] ?? 0) * h} ${b.x - h},${b.y - (m[i + 1] ?? 0) * h} ${b.x},${b.y}`;
  }
  return d;
}

/** "Nice" axis maximum (1, 2, 2.5, 5 × 10^k) at or above `value`. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * exp >= value) return step * exp;
  }
  return 10 * exp;
}

/** SVG arc path for a donut segment between two angles (radians, 0 = 12 o'clock). */
export function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  a0: number,
  a1: number,
): string {
  const sweep = a1 - a0;
  if (sweep >= Math.PI * 2 - 1e-6) {
    // Full ring: two half arcs
    return [
      arcPath(cx, cy, rOuter, rInner, a0, a0 + Math.PI),
      arcPath(cx, cy, rOuter, rInner, a0 + Math.PI, a0 + Math.PI * 2 - 1e-4),
    ].join(' ');
  }
  const pt = (r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const;
  const large = sweep > Math.PI ? 1 : 0;
  const [x0, y0] = pt(rOuter, a0);
  const [x1, y1] = pt(rOuter, a1);
  const [x2, y2] = pt(rInner, a1);
  const [x3, y3] = pt(rInner, a0);
  return `M${x0},${y0} A${rOuter},${rOuter} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${rInner},${rInner} 0 ${large} 0 ${x3},${y3} Z`;
}
