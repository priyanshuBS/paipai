/**
 * Local sandbox: runs the API against in-memory Postgres (PGlite) with OTP
 * codes printed to the console instead of emailed. Nothing touches Neon or
 * Resend. Data is lost when the process exits.
 *
 *   pnpm --filter @paipai/api dev:local
 */
import { serve } from '@hono/node-server';
import { createTestDb } from '@paipai/db/testing';
import { createApp } from './app';
import { createConsoleMailer } from './email/mailer';
import { loadEnv } from './env';
import { logger } from './lib/logger';
import { startRecurringScheduler } from './scheduler';

const env = { ...loadEnv(), NODE_ENV: 'development' as const, RESEND_API_KEY: undefined };
const { db } = await createTestDb();
const { app, deps } = createApp({ env, db, mailer: createConsoleMailer() });
startRecurringScheduler(db, deps.notifier, 60_000);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info('server.started', {
    port: info.port,
    mode: 'local-sandbox (PGlite, OTP in console)',
  });
});
