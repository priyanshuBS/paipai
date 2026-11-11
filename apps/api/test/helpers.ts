import { sql } from '@paipai/db';
import { createTestDb } from '@paipai/db/testing';
import { createApp } from '../src/app';
import { createMemoryMailer } from '../src/email/mailer';
import { envSchema } from '../src/env';
import { createMemoryNotifier } from '../src/lib/notifier';
import type { StorageProvider } from '../src/lib/storage';

export const WEB = 'http://localhost:3000';

export async function setup(opts: { storage?: StorageProvider | null } = {}) {
  const { db, close } = await createTestDb();
  const env = envSchema.parse({
    NODE_ENV: 'test',
    DATABASE_URL: 'pglite://memory',
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-123456',
    BETTER_AUTH_URL: 'http://localhost:8787',
    WEB_URL: WEB,
    CRON_SECRET: 'test-cron-secret-0123456789',
  });
  const mailer = createMemoryMailer();
  const notifier = createMemoryNotifier();
  const { app } = createApp({ env, db, mailer, notifier, storage: opts.storage ?? null });

  async function request(
    path: string,
    init: {
      method?: string;
      body?: unknown;
      cookie?: string;
      headers?: Record<string, string>;
    } = {},
  ) {
    const headers: Record<string, string> = { origin: WEB, ...init.headers };
    if (init.body !== undefined) headers['content-type'] = 'application/json';
    if (init.cookie) headers.cookie = init.cookie;
    const res = await app.request(path, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers,
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return {
      status: res.status,
      json: json as Record<string, unknown> & { [k: string]: never },
      res,
    };
  }

  /** JSON helper typed loosely for assertions. */
  async function call<T = Record<string, unknown>>(
    path: string,
    init: Parameters<typeof request>[1] = {},
  ): Promise<{ status: number; body: T; res: Response }> {
    const r = await request(path, init);
    return { status: r.status, body: r.json as unknown as T, res: r.res };
  }

  function cookieFrom(res: Response): string {
    const setCookies = res.headers.getSetCookie();
    return setCookies.map((c) => c.split(';')[0]).join('; ');
  }

  async function sendOtp(email: string) {
    return call('/api/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } });
  }

  /** Full OTP sign-up / login. Returns the session cookie. */
  async function signIn(email: string, name?: string): Promise<string> {
    // Tests sign in repeatedly; skip the per-email resend cooldown (tested separately).
    await db.execute(
      sql`DELETE FROM rate_limits WHERE key = ${`otp:cooldown:${email.toLowerCase()}`}`,
    );
    const sent = await sendOtp(email);
    if (sent.status !== 200)
      throw new Error(`send otp failed: ${sent.status} ${JSON.stringify(sent.body)}`);
    const otp = mailer.last(email);
    if (!otp) throw new Error('no otp captured');
    const r = await call('/api/auth/sign-in/email-otp', {
      body: { email, otp, ...(name ? { name } : {}) },
    });
    if (r.status !== 200) throw new Error(`sign in failed: ${r.status} ${JSON.stringify(r.body)}`);
    return cookieFrom(r.res);
  }

  return { app, db, mailer, notifier, close, call, sendOtp, signIn, cookieFrom };
}

export type TestCtx = Awaited<ReturnType<typeof setup>>;
