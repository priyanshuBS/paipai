import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    // Only needed for `migrate`/`studio`; `generate` works without a database.
    url: process.env.DATABASE_URL ?? 'postgres://placeholder',
  },
  strict: true,
  verbose: true,
});
