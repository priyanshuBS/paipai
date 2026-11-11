import { loadEnv } from '../src/env';
import { createDb } from '../src/client';
import { seedSystemCategories } from '../src/seed';

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it to the repo-root .env (or packages/db/.env).');
  process.exit(1);
}

const { db, close } = createDb(url, { max: 1 });
try {
  const n = await seedSystemCategories(db);
  console.info(`Seeded ${n} system categories.`);
} finally {
  await close();
}
