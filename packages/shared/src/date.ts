/**
 * Timezone-aware date helpers. Timestamps are stored in UTC; every grouping
 * (day/week/month/year) is computed in the user's timezone, which defaults to
 * Asia/Kolkata. Weeks start on Monday (M T W T F S S).
 */
import { TZDate } from '@date-fns/tz';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const WEEK_STARTS_ON = 1 as const; // Monday

export type Period = 'day' | 'week' | 'month' | 'year';

export interface DateRange {
  /** Inclusive start (UTC instant). */
  from: Date;
  /** Exclusive end (UTC instant). */
  to: Date;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function inTz(date: Date | number, tz: string): TZDate {
  return new TZDate(typeof date === 'number' ? date : date.getTime(), tz);
}

function toUtc(d: Date): Date {
  return new Date(d.getTime());
}

/** Range covering the period that contains `anchor`, in `tz`. */
export function getPeriodRange(
  period: Period,
  anchor: Date,
  tz: string = DEFAULT_TIMEZONE,
): DateRange {
  const a = inTz(anchor, tz);
  switch (period) {
    case 'day': {
      const from = startOfDay(a);
      return { from: toUtc(from), to: toUtc(addDays(from, 1)) };
    }
    case 'week': {
      const from = startOfWeek(a, { weekStartsOn: WEEK_STARTS_ON });
      return { from: toUtc(from), to: toUtc(addWeeks(from, 1)) };
    }
    case 'month': {
      const from = startOfMonth(a);
      return { from: toUtc(from), to: toUtc(addMonths(from, 1)) };
    }
    case 'year': {
      const from = startOfYear(a);
      return { from: toUtc(from), to: toUtc(addYears(from, 1)) };
    }
  }
}

/** The period immediately before `range` (same length in calendar terms). */
export function getPreviousPeriodRange(
  period: Period | 'custom',
  range: DateRange,
  tz: string = DEFAULT_TIMEZONE,
): DateRange {
  const from = inTz(range.from, tz);
  switch (period) {
    case 'day':
      return { from: toUtc(addDays(from, -1)), to: range.from };
    case 'week':
      return { from: toUtc(addWeeks(from, -1)), to: range.from };
    case 'month':
      return { from: toUtc(addMonths(from, -1)), to: range.from };
    case 'year':
      return { from: toUtc(addYears(from, -1)), to: range.from };
    case 'custom': {
      const days = Math.max(1, differenceInCalendarDays(inTz(range.to, tz), from));
      return { from: toUtc(addDays(from, -days)), to: range.from };
    }
  }
}

/**
 * Build a range from inclusive calendar dates "YYYY-MM-DD" in `tz`.
 * `to` is inclusive here (the whole of that day is included).
 */
export function rangeFromDateStrings(
  fromDate: string,
  toDate: string,
  tz: string = DEFAULT_TIMEZONE,
): DateRange {
  const from = startOfDay(parseDateInTz(fromDate, tz));
  const to = addDays(startOfDay(parseDateInTz(toDate, tz)), 1);
  return { from: toUtc(from), to: toUtc(to) };
}

/** Parse "YYYY-MM-DD" as midnight in `tz`. */
export function parseDateInTz(date: string, tz: string = DEFAULT_TIMEZONE): TZDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new RangeError(`Invalid date string: ${date}`);
  return new TZDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0, tz);
}

/** Calendar day key "YYYY-MM-DD" for an instant, in `tz`. */
export function dayKey(date: Date | string, tz: string = DEFAULT_TIMEZONE): string {
  const d = inTz(typeof date === 'string' ? new Date(date) : date, tz);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Month key "YYYY-MM" for an instant, in `tz`. */
export function monthKey(date: Date | string, tz: string = DEFAULT_TIMEZONE): string {
  return dayKey(date, tz).slice(0, 7);
}

/** Start of "today" in `tz`, as a UTC instant. */
export function startOfToday(tz: string = DEFAULT_TIMEZONE, now: Date = new Date()): Date {
  return toUtc(startOfDay(inTz(now, tz)));
}

/** Same wall-clock time as `now`, one day earlier, in `tz` (for the "Yesterday" chip). */
export function sameTimeYesterday(tz: string = DEFAULT_TIMEZONE, now: Date = new Date()): Date {
  return toUtc(addDays(inTz(now, tz), -1));
}

/** End of the day (23:59:59.999) for an instant, in `tz`. */
export function endOfDayInTz(date: Date, tz: string = DEFAULT_TIMEZONE): Date {
  return toUtc(endOfDay(inTz(date, tz)));
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${tz}|${JSON.stringify(opts)}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-IN', { timeZone: tz, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

/** "10:30 am" */
export function formatTime(date: Date | string, tz: string = DEFAULT_TIMEZONE): string {
  return fmt(tz, { hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(date))
    .toLowerCase();
}

/** "Jul 2024" */
export function formatMonthLabel(date: Date | string, tz: string = DEFAULT_TIMEZONE): string {
  return fmt(tz, { month: 'short', year: 'numeric' }).format(new Date(date));
}

/** "8 Jul 2024" */
export function formatDate(date: Date | string, tz: string = DEFAULT_TIMEZONE): string {
  return fmt(tz, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
}

/** Section header for grouped transaction lists: "Today", "Yesterday", "Mon, 8 Jul". */
export function formatDayHeader(
  date: Date | string,
  tz: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string {
  const key = dayKey(date, tz);
  if (key === dayKey(now, tz)) return 'Today';
  if (key === dayKey(sameTimeYesterday(tz, now), tz)) return 'Yesterday';
  const sameYear = key.slice(0, 4) === dayKey(now, tz).slice(0, 4);
  return fmt(tz, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(new Date(date));
}

/** Short weekday initials, Monday first, for the weekly bar chart. */
export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** Normalised key for item-wise grouping: trims, collapses whitespace, lowercases. */
export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
