import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Absolute path to the generated SQL migrations. */
export const MIGRATIONS_FOLDER = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../drizzle',
);
