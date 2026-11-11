/**
 * Money helpers. All amounts are stored and transported as integer paise
 * (₹30 = 3000). Floats are never used for arithmetic; conversion from user
 * input is done by string parsing.
 */

export type Paise = number;

export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_LOCALE = 'en-IN';

/** Upper bound for a single amount: ₹1,000 crore. Keeps us well inside Number.MAX_SAFE_INTEGER. */
export const MAX_AMOUNT_PAISE = 1_000_00_00_000_00;

const AMOUNT_RE = /^(\d+)(?:\.(\d{0,2}))?$/;

/**
 * Parse a rupee string typed by a user ("30", "30.5", "1,250.75", "₹ 99") into paise.
 * Returns null when the input is not a valid non-negative amount with at most 2 decimals.
 */
export function parseRupeesToPaise(input: string): Paise | null {
  const cleaned = input.replace(/[₹,\s]/g, '').replace(/^Rs\.?/i, '');
  if (cleaned === '' || cleaned === '.') return null;
  const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;
  const match = AMOUNT_RE.exec(normalized);
  if (!match) return null;
  const rupees = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(2, '0');
  // Strip leading zeros but keep at least one digit, then combine as a string to avoid float maths.
  const digits = `${rupees.replace(/^0+(?=\d)/, '')}${fraction}`;
  const paise = Number.parseInt(digits, 10);
  if (!Number.isSafeInteger(paise) || paise > MAX_AMOUNT_PAISE) return null;
  return paise;
}

/** Convert paise to a plain rupee string with exactly two decimals ("30.00"). */
export function paiseToRupeesString(paise: Paise): string {
  assertInteger(paise);
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${rupees}.${fraction}`;
}

/** Compact editable representation for inputs: "30", "30.5", "30.05". */
export function paiseToInputString(paise: Paise): string {
  const [r, f = '00'] = paiseToRupeesString(paise).split('.');
  if (f === '00') return r ?? '0';
  return f.endsWith('0') ? `${r}.${f[0]}` : `${r}.${f}`;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  currency: string,
  fractionDigits: number,
  compact: boolean,
): Intl.NumberFormat {
  const key = `${currency}:${fractionDigits}:${compact}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: compact ? 0 : fractionDigits,
      maximumFractionDigits: fractionDigits,
      ...(compact ? { notation: 'compact' as const, compactDisplay: 'short' as const } : {}),
    });
    formatterCache.set(key, f);
  }
  return f;
}

export interface FormatMoneyOptions {
  currency?: string;
  /** Hide the ".00" when the amount is a whole number of rupees. Default true. */
  trimZeroPaise?: boolean;
  /** "₹1.2L" style compact notation for chart axes. */
  compact?: boolean;
  /** Prefix "+" for positive amounts (e.g. income rows). */
  signed?: boolean;
}

let displayCurrency: string = DEFAULT_CURRENCY;

/** Set the currency used by `formatMoney` when none is passed (the user's setting). */
export function setDisplayCurrency(code: string | null | undefined): void {
  displayCurrency = code && /^[A-Z]{3}$/.test(code) ? code : DEFAULT_CURRENCY;
}

export function getDisplayCurrency(): string {
  return displayCurrency;
}

/**
 * Format minor units (paise/cents) using the en-IN locale and the user's
 * display currency, e.g. 12345600 -> "₹1,23,456".
 */
export function formatMoney(paise: Paise, options: FormatMoneyOptions = {}): string {
  assertInteger(paise);
  const {
    currency = displayCurrency,
    trimZeroPaise = true,
    compact = false,
    signed = false,
  } = options;
  const whole = paise % 100 === 0;
  const digits = trimZeroPaise && whole ? 0 : 2;
  // Division here is only for display; the stored value stays an integer.
  const formatted = getFormatter(currency, compact ? 1 : digits, compact).format(paise / 100);
  if (signed && paise > 0) return `+${formatted}`;
  return formatted;
}

/** Shorthand for INR formatting. */
export const formatINR = (paise: Paise, options: Omit<FormatMoneyOptions, 'currency'> = {}) =>
  formatMoney(paise, { ...options, currency: 'INR' });

/** Sum a list of paise values (integer safe). */
export function sumPaise(values: readonly Paise[]): Paise {
  let total = 0;
  for (const v of values) {
    assertInteger(v);
    total += v;
  }
  return total;
}

/**
 * Percentage change from previous to current, rounded to one decimal place.
 * Returns null when there is no previous value to compare against.
 */
export function percentChange(current: Paise, previous: Paise): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Share of a part in a total as a percentage (one decimal). */
export function percentOf(part: Paise, total: Paise): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function assertInteger(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Money values must be safe integers (paise). Received: ${value}`);
  }
}
