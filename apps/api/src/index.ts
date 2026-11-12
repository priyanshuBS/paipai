import { serve } from '@hono/node-server';
import { createDb } from '@paipai/db';
import { createApp } from './app';
import { loadEnv } from './env';
import { logger } from './lib/logger';
import { startRecurringScheduler } from './scheduler';

const env = loadEnv();
const { db, close } = createDb(env.DATABASE_URL);
const { app, deps } = createApp({ env, db });
const stopScheduler = env.DISABLE_SCHEDULER
  ? () => undefined
  : startRecurringScheduler(db, deps.notifier);

// Hosts like Render and Fly inject PORT and expect the server on 0.0.0.0.
const server = serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
  logger.info('server.started', {
    port: info.port,
    env: env.NODE_ENV,
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    email: env.RESEND_API_KEY ? 'resend' : 'console',
    scheduler: env.DISABLE_SCHEDULER ? 'off (cron endpoint)' : 'in-process',
    uploads: deps.storage ? 'r2' : 'off',
  });
});

let stopping = false;
async function shutdown(signal: string, code = 0) {
  if (stopping) return;
  stopping = true;
  logger.info('server.stopping', { signal });
  // Never hang a deploy: force-exit if connections don't drain in time.
  setTimeout(() => process.exit(code), 10_000).unref();
  stopScheduler();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await close().catch(() => undefined);
  process.exit(code);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('process.unhandled_rejection', { error: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('process.uncaught_exception', { error: err.message, stack: err.stack });
  void shutdown('uncaughtException', 1);
});
