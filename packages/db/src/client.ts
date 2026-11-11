import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Schema = typeof schema;

/**
 * Driver-agnostic database type. Production uses Neon (WebSocket pool, which
 * supports interactive transactions); tests use in-process PGlite.
 */
export type Database = PgDatabase<PgQueryResultHKT, Schema>;

export interface CreateDbOptions {
  /** Max pooled connections (Neon pooler handles fan-out). */
  max?: number;
}

/** Create a Drizzle client backed by Neon's serverless driver. */
export function createDb(
  databaseUrl: string,
  options: CreateDbOptions = {},
): {
  db: Database;
  close: () => Promise<void>;
} {
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  // Node 22+ ships a global WebSocket; older runtimes need the `ws` package.
  if (typeof WebSocket !== 'undefined' && !neonConfig.webSocketConstructor) {
    neonConfig.webSocketConstructor = WebSocket;
  }
  const pool = new Pool({ connectionString: databaseUrl, max: options.max ?? 10 });
  const db = drizzle({ client: pool, schema });
  return { db, close: () => pool.end() };
}
