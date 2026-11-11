import { serve } from '@hono/node-server';
import { createDb } from '@paipai/db';
import { createApp } from './app';
import { loadEnv } from './env';
import { logger } from './lib/logger';

const env = loadEnv();
const { db, close } = createDb(env.DATABASE_URL);
const { app } = createApp({ env, db });

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
  server.close();
  await close();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
