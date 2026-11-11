import { loadEnv } from '../src/env';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { createDb } from '../src/client';
import { MIGRATIONS_FOLDER } from '../src/paths';

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it to the repo-root .env (or packages/db/.env).');
  process.exit(1);
}

const { db, close } = createDb(url, { max: 1 });
try {
  console.info('Applying migrations…');
  // The Neon migrator expects the NeonDatabase type; ours is the structural supertype.
  await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: MIGRATIONS_FOLDER });
  console.info('Migrations applied.');
} finally {
  await close();
}
