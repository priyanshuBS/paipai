/**
 * Recurrence maths for recurring transactions. Occurrences are always computed
 * from the original start (start + n periods) in the user's timezone, so a
 * "31st of every month" rule lands on 29 Feb / 30 Apr without drifting.
 */
import { TZDate } from '@date-fns/tz';
import { addDays, addMonths, addWeeks, addYears } from 'date-fns';
import { DEFAULT_TIMEZONE } from './date';
import type { RecurringFrequency } from './schemas/common';

/** The n-th occurrence (n = 0 is the start itself). */
export function occurrenceAt(
  startAt: Date,
  frequency: RecurringFrequency,
  n: number,
  tz: string = DEFAULT_TIMEZONE,
): Date {
  const start = new TZDate(startAt.getTime(), tz);
  const d =
    frequency === 'daily'
      ? addDays(start, n)
      : frequency === 'weekly'
        ? addWeeks(start, n)
        : frequency === 'monthly'
          ? addMonths(start, n)
          : addYears(start, n);
  return new Date(d.getTime());
}

const APPROX_DAYS: Record<RecurringFrequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30.4375,
  yearly: 365.25,
};

/** First occurrence strictly after `after` (or the start, if it is after `after`). */
export function nextOccurrence(
  startAt: Date,
  frequency: RecurringFrequency,
  after: Date,
  tz: string = DEFAULT_TIMEZONE,
): Date {
  if (startAt.getTime() > after.getTime()) return startAt;
  // Jump close to the answer, then step: O(1) even for long-running rules.
  const elapsedDays = (after.getTime() - startAt.getTime()) / 86_400_000;
  let n = Math.max(0, Math.floor(elapsedDays / APPROX_DAYS[frequency]) - 1);
  let d = occurrenceAt(startAt, frequency, n, tz);
  while (d.getTime() <= after.getTime()) {
    n += 1;
    d = occurrenceAt(startAt, frequency, n, tz);
  }
  return d;
}

/** All occurrences in (after, until], capped to `limit` (protects against huge catch-ups). */
export function occurrencesBetween(
  startAt: Date,
  frequency: RecurringFrequency,
  after: Date,
  until: Date,
  tz: string = DEFAULT_TIMEZONE,
  limit = 366,
): Date[] {
  const out: Date[] = [];
  let d = nextOccurrence(startAt, frequency, after, tz);
  while (d.getTime() <= until.getTime() && out.length < limit) {
    out.push(d);
    d = nextOccurrence(startAt, frequency, d, tz);
  }
  return out;
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};
