import { describe, expect, it } from 'vitest';
import {
  formatINR,
  paiseToInputString,
  paiseToRupeesString,
  parseRupeesToPaise,
  percentChange,
  percentOf,
  sumPaise,
} from './money';

describe('parseRupeesToPaise', () => {
  it.each([
    ['30', 3000],
    ['30.5', 3050],
    ['30.05', 3005],
    ['0.1', 10],
    ['.5', 50],
    ['1,250.75', 125075],
    ['₹ 99', 9900],
    ['Rs. 12', 1200],
    ['007', 700],
    ['0', 0],
  ])('parses %s -> %d', (input, expected) => {
    expect(parseRupeesToPaise(input)).toBe(expected);
  });

  it('avoids float rounding errors', () => {
    // 0.1 + 0.2 style issues: 19.99 * 100 = 1998.9999999999998 in floats
    expect(parseRupeesToPaise('19.99')).toBe(1999);
    expect(parseRupeesToPaise('1.005')).toBeNull();
  });

  it.each(['', '.', 'abc', '-5', '1.234', '1.2.3', '1e5'])('rejects %s', (input) => {
    expect(parseRupeesToPaise(input)).toBeNull();
  });

  it('rejects absurdly large values', () => {
    expect(parseRupeesToPaise('99999999999999999')).toBeNull();
  });
});

describe('paise string conversion', () => {
  it('formats with two decimals', () => {
    expect(paiseToRupeesString(3000)).toBe('30.00');
    expect(paiseToRupeesString(5)).toBe('0.05');
    expect(paiseToRupeesString(-12345)).toBe('-123.45');
  });

  it('gives compact input strings', () => {
    expect(paiseToInputString(3000)).toBe('30');
    expect(paiseToInputString(3050)).toBe('30.5');
    expect(paiseToInputString(3005)).toBe('30.05');
  });

  it('rejects non-integers', () => {
    expect(() => paiseToRupeesString(10.5)).toThrow(TypeError);
  });
});

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(12345600)).toBe('₹1,23,456');
    expect(formatINR(1_00_00_000_00)).toBe('₹1,00,00,000');
  });

  it('shows paise only when needed', () => {
    expect(formatINR(3000)).toBe('₹30');
    expect(formatINR(3050)).toBe('₹30.50');
    expect(formatINR(3050, { trimZeroPaise: false })).toBe('₹30.50');
    expect(formatINR(3000, { trimZeroPaise: false })).toBe('₹30.00');
  });

  it('supports signed output', () => {
    expect(formatINR(3000, { signed: true })).toBe('+₹30');
    expect(formatINR(-3000)).toBe('-₹30');
  });

  it('supports compact notation', () => {
    expect(formatINR(1_50_000_00, { compact: true })).toMatch(/1\.5L/);
  });
});

describe('aggregation helpers', () => {
  it('sums integers', () => {
    expect(sumPaise([1999, 1, 3000])).toBe(5000);
  });

  it('computes percent change', () => {
    expect(percentChange(10480, 10000)).toBe(4.8);
    expect(percentChange(9000, 10000)).toBe(-10);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(500, 0)).toBeNull();
  });

  it('computes share of total', () => {
    expect(percentOf(450, 700)).toBe(64.3);
    expect(percentOf(1, 0)).toBe(0);
  });
});
