import { describe, expect, it } from 'vitest';
import { arcPath, monotonePath, niceMax } from './geometry';

describe('niceMax', () => {
  it('rounds up to friendly axis values', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(380)).toBe(500);
    expect(niceMax(12000)).toBe(20000);
    expect(niceMax(2400)).toBe(2500);
    expect(niceMax(100)).toBe(100);
  });
});

describe('monotonePath', () => {
  it('handles 0, 1 and many points', () => {
    expect(monotonePath([])).toBe('');
    expect(monotonePath([{ x: 0, y: 5 }])).toBe('M0,5');
    const d = monotonePath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    expect(d.startsWith('M0,10 C')).toBe(true);
    expect(d.endsWith('20,10')).toBe(true);
  });

  it('does not overshoot flat segments (no dip below the baseline)', () => {
    const d = monotonePath([
      { x: 0, y: 100 },
      { x: 10, y: 100 },
      { x: 20, y: 0 },
      { x: 30, y: 100 },
    ]);
    const ys = [...d.matchAll(/[ ,](-?\d+(?:\.\d+)?)(?= |$)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(100.0001);
  });
});

describe('arcPath', () => {
  it('builds closed segments and full rings', () => {
    expect(arcPath(50, 50, 40, 25, 0, Math.PI / 2)).toMatch(
      /^M50,10 A40,40 0 0 1 90,50 L75,50 A25,25 0 0 0 50,25 Z$/,
    );
    expect(arcPath(50, 50, 40, 25, 0, Math.PI * 2).split('Z')).toHaveLength(3);
  });
});
