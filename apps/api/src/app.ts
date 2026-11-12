import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { sql, type Database } from '@paipai/db';
import { createAuth } from './auth';
import { createConsoleMailer, createResendMailer, type Mailer } from './email/mailer';
import { trustedOrigins, type Env } from './env';
import { AppError } from './lib/errors';
import { errorResponse, rateLimit, requestLogger, requireAuth } from './middleware';
import { analyticsRoutes } from './routes/analytics';
import { categoryRoutes } from './routes/categories';
import { meRoutes } from './routes/me';
import { transactionRoutes } from './routes/transactions';
import {
  budgetRoutes,
  exportRoutes,
  pushTokenRoutes,
  recurringRoutes,
  reportRoutes,
  uploadRoutes,
} from './routes/phase5';
import { createExpoNotifier, type Notifier } from './lib/notifier';
import { createStorage, type StorageProvider } from './lib/storage';
import { runDueRecurring } from './services/recurring';
import { timingSafeEqual } from 'node:crypto';
import type { AppEnv } from './types';

export interface CreateAppOptions {
  env: Env;
  db: Database;
  mailer?: Mailer;
  notifier?: Notifier;
  storage?: StorageProvider | null;
}

export function createApp({ env, db, mailer, notifier, storage }: CreateAppOptions) {
  const resolvedMailer =
    mailer ??
    (env.RESEND_API_KEY
      ? createResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM)
      : env.NODE_ENV === 'production'
        ? (() => {
            throw new Error('RESEND_API_KEY is required in production');
          })()
        : createConsoleMailer());

  const auth = createAuth({ env, db, mailer: resolvedMailer });
  const deps = {
    env,
    db,
    auth,
    notifier: notifier ?? createExpoNotifier(db),
    storage: storage === undefined ? createStorage(env) : storage,
  };
  const origins = trustedOrigins(env).filter((o) => o.startsWith('http'));

  const app = new Hono<AppEnv>();

  app.use('*', requestId());
  app.use('*', async (c, next) => {
    c.set('deps', deps);
    await next();
  });
  app.use('*', requestLogger);
  app.use(
    '*',
    secureHeaders({
      crossOriginResourcePolicy: 'same-site',
      referrerPolicy: 'strict-origin-when-cross-origin',
    }),
  );
  app.use(
    '/api/*',
    cors({
      origin: (origin) => (origins.includes(origin) ? origin : null),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposeHeaders: ['X-Request-Id', 'RateLimit-Remaining', 'Retry-After', 'Content-Disposition'],
      maxAge: 600,
    }),
  );
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: () => {
        throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
      },
    }),
  );

  // Liveness: the process is up. Readiness: it can reach the database too.
  app.get('/health', (c) => c.json({ ok: true, service: 'paipai-api' }));
  app.get('/health/ready', async (c) => {
    const started = Date.now();
    try {
      await db.execute(sql`select 1`);
      return c.json({ ok: true, db: 'up', latencyMs: Date.now() - started });
    } catch {
      return c.json({ ok: false, db: 'down' }, 503);
    }
  });

  // Better Auth: email OTP, Google OAuth, sessions, sign-out, revoke-sessions …
  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));

  // Cron trigger for serverless hosts (Vercel Cron, Render cron job, GitHub Actions…).
  app.post('/api/cron/recurring', async (c) => {
    const secret = env.CRON_SECRET;
    const given = (c.req.header('authorization') ?? '').replace(/^Bearer /, '');
    const ok =
      !!secret &&
      given.length === secret.length &&
      timingSafeEqual(Buffer.from(given), Buffer.from(secret));
    if (!ok) throw new AppError(401, 'UNAUTHORIZED', 'Invalid cron secret');
    return c.json(await runDueRecurring(db));
  });

  const api = new Hono<AppEnv>();
  api.use('*', requireAuth);
  api.use('*', rateLimit({ windowMs: 60_000, max: env.NODE_ENV === 'test' ? 10_000 : 300 }));
  api.route('/me', meRoutes);
  api.route('/transactions', transactionRoutes);
  api.route('/categories', categoryRoutes);
  api.route('/analytics', analyticsRoutes);
  api.route('/budgets', budgetRoutes);
  api.route('/recurring', recurringRoutes);
  api.route('/push-tokens', pushTokenRoutes);
  api.route('/export', exportRoutes);
  api.route('/reports', reportRoutes);
  api.route('/uploads', uploadRoutes);
  app.route('/api', api);

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));
  app.onError(errorResponse);

  return { app, auth, deps };
}

export type App = ReturnType<typeof createApp>['app'];
