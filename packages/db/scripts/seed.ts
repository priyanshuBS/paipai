import 'dotenv/config';
import { createDb } from '../src/client';
import { seedSystemCategories } from '../src/seed';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy packages/db/.env.example to packages/db/.env.');
  process.exit(1);
}

const { db, close } = createDb(url, { max: 1 });
try {
  const n = await seedSystemCategories(db);
  console.info(`Seeded ${n} system categories.`);
} finally {
  await close();
}
