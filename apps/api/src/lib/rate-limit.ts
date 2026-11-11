import { queryRows, sql, type Database } from '@paipai/db';

export interface LimitResult {
  allowed: boolean;
  count: number;
  /** Milliseconds until the current window resets. */
  retryAfterMs: number;
}

/**
 * Fixed-window counter stored in Postgres (`rate_limits` table) so limits hold
 * across multiple/serverless API instances. One atomic upsert per hit.
 */
export async function hitDbLimit(
  db: Database,
  key: string,
  windowMs: number,
  max: number,
  now: number = Date.now(),
): Promise<LimitResult> {
  const rows = await queryRows<{ count: number; window_start: string | number }>(
    db,
    sql`
    INSERT INTO rate_limits (id, key, count, last_request)
    VALUES (gen_random_uuid()::text, ${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.last_request <= ${now - windowMs} THEN 1 ELSE rate_limits.count + 1 END,
      last_request = CASE WHEN rate_limits.last_request <= ${now - windowMs} THEN ${now} ELSE rate_limits.last_request END
    RETURNING count, last_request AS window_start
  `,
  );
  const row = rows[0];
  const count = Number(row?.count ?? 1);
  const windowStart = Number(row?.window_start ?? now);
  return {
    allowed: count <= max,
    count,
    retryAfterMs: Math.max(0, windowStart + windowMs - now),
  };
}

/** In-memory fixed-window limiter for general API traffic (per instance). */
export function createMemoryLimiter(windowMs: number, max: number) {
  const hits = new Map<string, { count: number; start: number }>();
  let lastSweep = Date.now();

  return function hit(key: string, now: number = Date.now()): LimitResult {
    if (now - lastSweep > windowMs) {
      for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
      lastSweep = now;
    }
    let entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      entry = { count: 0, start: now };
      hits.set(key, entry);
    }
    entry.count += 1;
    return {
      allowed: entry.count <= max,
      count: entry.count,
      retryAfterMs: Math.max(0, entry.start + windowMs - now),
    };
  };
}
