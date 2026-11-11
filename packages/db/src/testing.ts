/**
 * In-process Postgres (PGlite) for tests and local verification. Applies the
 * same SQL migrations that run against Neon, so tests exercise the real schema.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Database } from './client';
import * as schema from './schema';
import { seedSystemCategories } from './seed';
import { MIGRATIONS_FOLDER } from './paths';

export { MIGRATIONS_FOLDER };

export async function createTestDb(options: { seed?: boolean } = {}): Promise<{
  db: Database;
  client: PGlite;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  if (options.seed ?? true) await seedSystemCategories(db);
  return { db, client, close: () => client.close() };
}
