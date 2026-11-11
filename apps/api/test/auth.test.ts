import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count, eq, transactions, users } from '@paipai/db';
import { setup, type TestCtx } from './helpers';

let t: TestCtx;
beforeAll(async () => {
  t = await setup();
});
afterAll(async () => {
  await t.close();
});

describe('protected routes', () => {
  it.each(['/api/me', '/api/transactions', '/api/categories', '/api/analytics/summary'])(
    '%s returns 401 without a session',
    async (path) => {
      const r = await t.call<{ error: { code: string } }>(path);
      expect(r.status).toBe(401);
      expect(r.body.error.code).toBe('UNAUTHORIZED');
    },
  );

  it('rejects a forged session cookie', async () => {
    const r = await t.call('/api/me', { cookie: 'paipai.session_token=forged.value' });
    expect(r.status).toBe(401);
  });

  it('returns structured 404 for unknown routes', async () => {
    const r = await t.call<{ error: { code: string } }>('/nope');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
  });

  it('sets security headers', async () => {
    const r = await t.call('/health');
    expect(r.res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });
});

describe('email OTP sign-up', () => {
  it('requires a name for new accounts', async () => {
    await t.sendOtp('newbie@example.com');
    const otp = t.mailer.last('newbie@example.com');
    const r = await t.call<{ code: string }>('/api/auth/sign-in/email-otp', {
      body: { email: 'newbie@example.com', otp },
    });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('NAME_REQUIRED');
  });

  it('creates the account with name and defaults, then logs in', async () => {
    const cookie = await t.signIn('Priya@Example.com', '  Priya Sharma ');
    const me = await t.call<{
      name: string;
      email: string;
      currency: string;
      timezone: string;
      emailVerified: boolean;
    }>('/api/me', { cookie });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      emailVerified: true,
    });
  });

  it('sends a 6-digit OTP', async () => {
    await t.sendOtp('digits@example.com');
    expect(t.mailer.last('digits@example.com')).toMatch(/^\d{6}$/);
  });

  it('logs in an existing user without a name (passwordless)', async () => {
    const cookie = await t.signIn('priya@example.com');
    const me = await t.call<{ name: string }>('/api/me', { cookie });
    expect(me.body.name).toBe('Priya Sharma');
  });

  it('enforces a 60s resend cooldown per email', async () => {
    const first = await t.sendOtp('cooldown@example.com');
    expect(first.status).toBe(200);
    const second = await t.call<{ code: string }>('/api/auth/email-otp/send-verification-otp', {
      body: { email: 'COOLDOWN@example.com', type: 'sign-in' },
    });
    expect(second.status).toBe(429);
    expect(second.body.code).toBe('OTP_COOLDOWN');
  });

  it('locks the OTP after 5 wrong attempts', async () => {
    await t.sendOtp('attempts@example.com');
    const otp = t.mailer.last('attempts@example.com') ?? '';
    const wrong = otp === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await t.call('/api/auth/sign-in/email-otp', {
        body: { email: 'attempts@example.com', otp: wrong, name: 'Attempt User' },
      });
      expect(r.status).toBe(400);
    }
    const final = await t.call<{ code: string }>('/api/auth/sign-in/email-otp', {
      body: { email: 'attempts@example.com', otp, name: 'Attempt User' },
    });
    expect(final.status).toBe(403);
    expect(final.body.code).toBe('TOO_MANY_ATTEMPTS');
  });

  it('rejects invalid emails', async () => {
    const r = await t.call<{ code: string }>('/api/auth/email-otp/send-verification-otp', {
      body: { email: 'not-an-email', type: 'sign-in' },
    });
    expect(r.status).toBe(400);
  });
});

describe('sessions', () => {
  it('logout invalidates the session', async () => {
    const cookie = await t.signIn('logout@example.com', 'Logout User');
    expect((await t.call('/api/me', { cookie })).status).toBe(200);
    const out = await t.call('/api/auth/sign-out', { method: 'POST', body: {}, cookie });
    expect(out.status).toBe(200);
    expect((await t.call('/api/me', { cookie })).status).toBe(401);
  });

  it('logout from all devices revokes every session', async () => {
    const phone = await t.signIn('devices@example.com', 'Device User');
    const laptop = await t.signIn('devices@example.com');
    expect((await t.call('/api/me', { cookie: phone })).status).toBe(200);
    expect((await t.call('/api/me', { cookie: laptop })).status).toBe(200);

    const r = await t.call('/api/auth/revoke-sessions', {
      method: 'POST',
      body: {},
      cookie: laptop,
    });
    expect(r.status).toBe(200);
    expect((await t.call('/api/me', { cookie: phone })).status).toBe(401);
    expect((await t.call('/api/me', { cookie: laptop })).status).toBe(401);
  });
});

describe('account', () => {
  it('PATCH /api/me validates and updates preferences', async () => {
    const cookie = await t.signIn('prefs@example.com', 'Prefs User');
    const bad = await t.call<{ error: { code: string } }>('/api/me', {
      method: 'PATCH',
      body: { timezone: 'Mars/Olympus' },
      cookie,
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');

    const ok = await t.call<{ monthlyBudget: number; theme: string; timezone: string }>('/api/me', {
      method: 'PATCH',
      body: { monthlyBudget: 2500000, theme: 'dark', timezone: 'Asia/Dubai' },
      cookie,
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      monthlyBudget: 2500000,
      theme: 'dark',
      timezone: 'Asia/Dubai',
    });
  });

  it('DELETE /api/me removes the user and all their data', async () => {
    const cookie = await t.signIn('delete-me@example.com', 'Delete Me');
    await t.call('/api/transactions', { body: { amount: 3000, title: 'Auto fare' }, cookie });
    const me = await t.call<{ id: string }>('/api/me', { cookie });

    const r = await t.call('/api/me', { method: 'DELETE', cookie });
    expect(r.status).toBe(200);
    expect((await t.call('/api/me', { cookie })).status).toBe(401);
    const [u] = await t.db.select({ n: count() }).from(users).where(eq(users.id, me.body.id));
    const [tx] = await t.db
      .select({ n: count() })
      .from(transactions)
      .where(eq(transactions.userId, me.body.id));
    expect(u?.n).toBe(0);
    expect(tx?.n).toBe(0);
  });
});
