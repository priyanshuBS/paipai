import type { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { DEFAULT_TIMEZONE, isValidTimeZone } from '@paipai/shared/date';
import { AppError, unauthorized } from '../lib/errors';
import { logger } from '../lib/logger';
import { createMemoryLimiter } from '../lib/rate-limit';
import type { AppEnv, UserCtx } from '../types';

/** Structured request log line per request. */
export const requestLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
  const start = performance.now();
  await next();
  const user = c.get('user') as AppEnv['Variables']['user'] | undefined;
  logger.info('http.request', {
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Math.round(performance.now() - start),
    userId: user?.id,
  });
};

/** Resolves the Better Auth session (cookie or Expo cookie header) or responds 401. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const { auth } = c.get('deps');
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result) throw unauthorized();
  c.set('user', result.user);
  c.set('session', result.session);
  await next();
};

export function userCtx(c: Context<AppEnv>): UserCtx {
  const user = c.get('user');
  const tz =
    typeof user.timezone === 'string' && isValidTimeZone(user.timezone)
      ? user.timezone
      : DEFAULT_TIMEZONE;
  return { userId: user.id, timezone: tz };
}

function clientIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-real-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/** General API rate limit: per user when authenticated, otherwise per IP. */
export function rateLimit(opts: { windowMs: number; max: number }): MiddlewareHandler<AppEnv> {
  const hit = createMemoryLimiter(opts.windowMs, opts.max);
  return async (c, next) => {
    const user = c.get('user') as AppEnv['Variables']['user'] | undefined;
    const key = user ? `u:${user.id}` : `ip:${clientIp(c)}`;
    const r = hit(key);
    c.header('RateLimit-Limit', String(opts.max));
    c.header('RateLimit-Remaining', String(Math.max(0, opts.max - r.count)));
    if (!r.allowed) {
      c.header('Retry-After', String(Math.ceil(r.retryAfterMs / 1000)));
      throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please slow down.');
    }
    await next();
  };
}

export function errorResponse(err: Error, c: Context<AppEnv>) {
  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      err.status,
    );
  }
  if (err instanceof HTTPException) {
    return c.json(
      { error: { code: 'HTTP_ERROR', message: err.message || 'Request failed' } },
      err.status,
    );
  }
  logger.error('http.unhandled_error', {
    requestId: c.get('requestId'),
    path: c.req.path,
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } },
    500,
  );
}
