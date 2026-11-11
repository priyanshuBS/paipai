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

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info('server.started', {
    port: info.port,
    env: env.NODE_ENV,
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    email: env.RESEND_API_KEY ? 'resend' : 'console',
  });
});

async function shutdown(signal: string) {
  logger.info('server.stopping', { signal });
  stopScheduler();
  server.close();
  await close();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
