import { describe, expect, it } from 'vitest';
import {
  dayKey,
  formatDayHeader,
  formatMonthLabel,
  formatTime,
  getPeriodRange,
  getPreviousPeriodRange,
  isValidTimeZone,
  monthKey,
  normalizeTitle,
  rangeFromDateStrings,
  sameTimeYesterday,
  startOfToday,
} from './date';

const IST = 'Asia/Kolkata';

describe('getPeriodRange (Asia/Kolkata)', () => {
  // 2024-07-10 01:00 IST == 2024-07-09 19:30 UTC — a different UTC day.
  const anchor = new Date('2024-07-09T19:30:00.000Z');

  it('day range starts at IST midnight', () => {
    const r = getPeriodRange('day', anchor, IST);
    expect(r.from.toISOString()).toBe('2024-07-09T18:30:00.000Z');
    expect(r.to.toISOString()).toBe('2024-07-10T18:30:00.000Z');
  });

  it('week starts on Monday', () => {
    // 10 Jul 2024 is a Wednesday -> week starts Mon 8 Jul IST
    const r = getPeriodRange('week', anchor, IST);
    expect(r.from.toISOString()).toBe('2024-07-07T18:30:00.000Z');
    expect(r.to.toISOString()).toBe('2024-07-14T18:30:00.000Z');
  });

  it('month and year ranges', () => {
    const m = getPeriodRange('month', anchor, IST);
    expect(m.from.toISOString()).toBe('2024-06-30T18:30:00.000Z');
    expect(m.to.toISOString()).toBe('2024-07-31T18:30:00.000Z');
    const y = getPeriodRange('year', anchor, IST);
    expect(y.from.toISOString()).toBe('2023-12-31T18:30:00.000Z');
    expect(y.to.toISOString()).toBe('2024-12-31T18:30:00.000Z');
  });

  it('handles DST timezones correctly', () => {
    // US DST started 10 Mar 2024; that day is 23 hours long in New York.
    const r = getPeriodRange('day', new Date('2024-03-10T12:00:00Z'), 'America/New_York');
    expect(r.from.toISOString()).toBe('2024-03-10T05:00:00.000Z');
    expect(r.to.toISOString()).toBe('2024-03-11T04:00:00.000Z');
  });
});

describe('getPreviousPeriodRange', () => {
  it('returns the previous month, which may have a different length', () => {
    const cur = getPeriodRange('month', new Date('2024-03-15T06:00:00Z'), IST);
    const prev = getPreviousPeriodRange('month', cur, IST);
    expect(prev.from.toISOString()).toBe('2024-01-31T18:30:00.000Z'); // 1 Feb IST
    expect(prev.to.toISOString()).toBe(cur.from.toISOString());
  });

  it('returns the previous week', () => {
    const cur = getPeriodRange('week', new Date('2024-07-10T06:00:00Z'), IST);
    const prev = getPreviousPeriodRange('week', cur, IST);
    expect(prev.from.toISOString()).toBe('2024-06-30T18:30:00.000Z');
  });

  it('mirrors custom ranges of the same number of days', () => {
    const cur = rangeFromDateStrings('2024-07-11', '2024-07-20', IST); // 10 days
    const prev = getPreviousPeriodRange('custom', cur, IST);
    expect(prev.from.toISOString()).toBe(
      rangeFromDateStrings('2024-07-01', '2024-07-10', IST).from.toISOString(),
    );
    expect(prev.to.toISOString()).toBe(cur.from.toISOString());
  });
});

describe('rangeFromDateStrings', () => {
  it('includes the whole `to` day', () => {
    const r = rangeFromDateStrings('2024-07-01', '2024-07-01', IST);
    expect(r.from.toISOString()).toBe('2024-06-30T18:30:00.000Z');
    expect(r.to.toISOString()).toBe('2024-07-01T18:30:00.000Z');
  });

  it('rejects malformed dates', () => {
    expect(() => rangeFromDateStrings('2024/07/01', '2024-07-01', IST)).toThrow(RangeError);
  });
});

describe('keys and formatting', () => {
  const lateNightUtc = new Date('2024-07-09T20:00:00.000Z'); // 01:30 IST on 10 Jul

  it('computes day/month keys in the user timezone', () => {
    expect(dayKey(lateNightUtc, IST)).toBe('2024-07-10');
    expect(dayKey(lateNightUtc, 'UTC')).toBe('2024-07-09');
    expect(monthKey(new Date('2024-07-31T19:00:00Z'), IST)).toBe('2024-08');
  });

  it('formats times and month labels', () => {
    expect(formatTime(lateNightUtc, IST)).toBe('1:30 am');
    expect(formatMonthLabel(lateNightUtc, IST)).toBe('Jul 2024');
  });

  it('labels day headers relative to now', () => {
    const now = new Date('2024-07-10T06:00:00Z');
    expect(formatDayHeader('2024-07-10T01:00:00Z', IST, now)).toBe('Today');
    expect(formatDayHeader('2024-07-09T01:00:00Z', IST, now)).toBe('Yesterday');
    expect(formatDayHeader('2024-07-08T06:00:00Z', IST, now)).toBe('Mon, 8 Jul');
    expect(formatDayHeader('2023-07-08T06:00:00Z', IST, now)).toBe('Sat, 8 Jul, 2023');
  });

  it('computes today and yesterday anchors', () => {
    const now = new Date('2024-07-10T06:00:00Z'); // 11:30 IST
    expect(startOfToday(IST, now).toISOString()).toBe('2024-07-09T18:30:00.000Z');
    expect(sameTimeYesterday(IST, now).toISOString()).toBe('2024-07-09T06:00:00.000Z');
  });
});

describe('misc', () => {
  it('validates timezones', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });

  it('normalises titles for item grouping', () => {
    expect(normalizeTitle('  Auto   Fare ')).toBe('auto fare');
  });
});
