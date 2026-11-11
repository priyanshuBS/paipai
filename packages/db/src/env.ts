import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Load env from packages/db/.env, falling back to the repo-root .env. */
export function loadEnv(): void {
  config({
    path: [path.resolve(here, '../.env'), path.resolve(here, '../../../.env')],
    quiet: true,
  });
}
