/**
 * SQL helpers for timezone-aware aggregation.
 *
 * The timezone is inlined as a literal (after strict validation) rather than
 * bound as a parameter: Postgres treats `x AT TIME ZONE $1` and
 * `x AT TIME ZONE $3` as different expressions, which breaks GROUP BY.
 */
import { sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { isValidTimeZone } from '@paipai/shared/date';

const TZ_NAME_RE = /^[A-Za-z0-9_+\-/]{1,64}$/;

/** A safe SQL string literal for an IANA timezone. Throws on anything suspicious. */
export function tzLiteral(tz: string): SQL {
  if (!TZ_NAME_RE.test(tz) || !isValidTimeZone(tz)) {
    throw new RangeError(`Invalid timezone: ${tz}`);
  }
  return sql.raw(`'${tz}'`);
}

/** `col AT TIME ZONE tz` -> local wall-clock timestamp (without time zone). */
export function localTime(col: AnyColumn | SQL, tz: string): SQL {
  return sql`(${col} AT TIME ZONE ${tzLiteral(tz)})`;
}

export type TruncUnit = 'hour' | 'day' | 'week' | 'month' | 'year';

/**
 * Bucket start as "YYYY-MM-DD" in the user's timezone. Postgres weeks start
 * on Monday, matching the client (M T W T F S S).
 */
export function localBucket(col: AnyColumn | SQL, tz: string, unit: TruncUnit): SQL<string> {
  return sql<string>`to_char(date_trunc(${sql.raw(`'${unit}'`)}, ${localTime(col, tz)}), 'YYYY-MM-DD')`;
}

/** ISO day of week in the user's timezone: 0 = Monday ... 6 = Sunday. */
export function localDow(col: AnyColumn | SQL, tz: string): SQL<number> {
  return sql<number>`(extract(isodow from ${localTime(col, tz)})::int - 1)`.mapWith(Number);
}

/** Hour of day (0-23) in the user's timezone. */
export function localHour(col: AnyColumn | SQL, tz: string): SQL<number> {
  return sql<number>`extract(hour from ${localTime(col, tz)})::int`.mapWith(Number);
}

/** Normalised title key: trimmed, whitespace-collapsed, lowercased. */
export function normalizedTitle(col: AnyColumn | SQL): SQL<string> {
  return sql<string>`lower(regexp_replace(trim(${col}), '\\s+', ' ', 'g'))`;
}

/** sum() of a bigint column returned as a JS number (0 when no rows). */
export function sumPaise(col: AnyColumn | SQL): SQL<number> {
  return sql<number>`coalesce(sum(${col}), 0)::bigint`.mapWith(Number);
}

/** sum() restricted by a FILTER clause, as a JS number (0 when no rows match). */
export function sumPaiseWhere(col: AnyColumn | SQL, condition: SQL): SQL<number> {
  return sql<number>`coalesce(sum(${col}) FILTER (WHERE ${condition}), 0)::bigint`.mapWith(Number);
}

/** count() restricted by a FILTER clause. */
export function countWhere(condition: SQL): SQL<number> {
  return sql<number>`count(*) FILTER (WHERE ${condition})::int`.mapWith(Number);
}

/**
 * Run a raw SQL query and return its rows. Works across drivers (Neon and
 * PGlite both return `{ rows }`); the generic Database type can't express that.
 */
export async function queryRows<T extends Record<string, unknown>>(
  db: { execute: (query: SQL) => Promise<unknown> },
  query: SQL,
): Promise<T[]> {
  const result = (await db.execute(query)) as { rows?: T[] } | T[];
  return Array.isArray(result) ? result : (result.rows ?? []);
}
