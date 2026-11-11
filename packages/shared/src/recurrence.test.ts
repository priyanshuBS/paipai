import { describe, expect, it } from 'vitest';
import { nextOccurrence, occurrenceAt, occurrencesBetween } from './recurrence';

const IST = 'Asia/Kolkata';
const ist = (s: string) => new Date(`${s}+05:30`);

describe('recurrence', () => {
  it('keeps the wall-clock time in the user timezone', () => {
    const start = ist('2024-07-01T09:00:00');
    expect(occurrenceAt(start, 'daily', 3, IST).toISOString()).toBe(
      ist('2024-07-04T09:00:00').toISOString(),
    );
    expect(occurrenceAt(start, 'weekly', 2, IST).toISOString()).toBe(
      ist('2024-07-15T09:00:00').toISOString(),
    );
  });

  it('clamps month-end without drifting (31st -> 29 Feb -> 31 Mar)', () => {
    const start = ist('2024-01-31T10:00:00');
    expect(occurrenceAt(start, 'monthly', 1, IST).toISOString()).toBe(
      ist('2024-02-29T10:00:00').toISOString(),
    );
    expect(occurrenceAt(start, 'monthly', 2, IST).toISOString()).toBe(
      ist('2024-03-31T10:00:00').toISOString(),
    );
    expect(occurrenceAt(start, 'monthly', 3, IST).toISOString()).toBe(
      ist('2024-04-30T10:00:00').toISOString(),
    );
  });

  it('handles leap-day yearly rules', () => {
    const start = ist('2024-02-29T08:00:00');
    expect(occurrenceAt(start, 'yearly', 1, IST).toISOString()).toBe(
      ist('2025-02-28T08:00:00').toISOString(),
    );
    expect(occurrenceAt(start, 'yearly', 4, IST).toISOString()).toBe(
      ist('2028-02-29T08:00:00').toISOString(),
    );
  });

  it('finds the next occurrence after a point in time', () => {
    const start = ist('2024-01-05T09:00:00');
    expect(nextOccurrence(start, 'monthly', ist('2024-01-01T00:00:00'), IST).toISOString()).toBe(
      start.toISOString(),
    );
    expect(nextOccurrence(start, 'monthly', start, IST).toISOString()).toBe(
      ist('2024-02-05T09:00:00').toISOString(),
    );
    expect(nextOccurrence(start, 'monthly', ist('2026-11-20T00:00:00'), IST).toISOString()).toBe(
      ist('2026-12-05T09:00:00').toISOString(),
    );
    expect(nextOccurrence(start, 'daily', ist('2030-06-01T09:00:00'), IST).toISOString()).toBe(
      ist('2030-06-02T09:00:00').toISOString(),
    );
  });

  it('lists catch-up occurrences in a window, with a cap', () => {
    const start = ist('2024-07-01T09:00:00');
    const list = occurrencesBetween(
      start,
      'weekly',
      ist('2024-06-30T00:00:00'),
      ist('2024-07-22T09:00:00'),
      IST,
    );
    expect(list.map((d) => d.toISOString())).toEqual(
      ['2024-07-01', '2024-07-08', '2024-07-15', '2024-07-22'].map((d) =>
        ist(`${d}T09:00:00`).toISOString(),
      ),
    );
    expect(
      occurrencesBetween(
        start,
        'daily',
        ist('2024-06-30T00:00:00'),
        ist('2030-01-01T00:00:00'),
        IST,
        10,
      ),
    ).toHaveLength(10);
  });
});
