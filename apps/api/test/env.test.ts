import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envSchema, productionProblems, trustedOrigins } from '../src/env';
import { setup, type TestCtx } from './helpers';

const prod = (over: Record<string, string> = {}) =>
  envSchema.parse({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://u:p@host/db',
    BETTER_AUTH_SECRET: 'a-real-looking-secret-with-enough-entropy-123',
    BETTER_AUTH_URL: 'https://api.paipai.example.in',
    WEB_URL: 'https://paipai.example.in',
    COOKIE_DOMAIN: '.paipai.example.in',
    RESEND_API_KEY: 're_live',
    EMAIL_FROM: 'PaiPai <hello@email.example.in>',
    CRON_SECRET: 'cron-secret-cron-secret-cron-secret',
    ...over,
  });

describe('production configuration checks', () => {
  it('accepts a correct production setup', () => {
    expect(productionProblems(prod())).toEqual([]);
  });

  it('accepts the real PaiPai production addresses', () => {
    expect(
      productionProblems(
        prod({
          BETTER_AUTH_URL: 'https://api.paipai.priyanshusingh.co.in',
          WEB_URL: 'https://paipai.priyanshusingh.co.in',
          COOKIE_DOMAIN: '.paipai.priyanshusingh.co.in',
          EMAIL_FROM: 'PaiPai <hello@email.priyanshusingh.co.in>',
        }),
      ),
    ).toEqual([]);
  });

  it('never complains outside production', () => {
    expect(
      productionProblems({ ...prod(), NODE_ENV: 'development', WEB_URL: 'http://localhost:3000' }),
    ).toEqual([]);
  });

  it('requires https URLs', () => {
    const problems = productionProblems(
      prod({
        WEB_URL: 'http://paipai.example.in',
        BETTER_AUTH_URL: 'http://api.paipai.example.in',
      }),
    );
    expect(problems).toContain('WEB_URL must be an https:// URL');
    expect(problems).toContain('BETTER_AUTH_URL must be an https:// URL');
  });

  it('rejects the placeholder secret, missing Resend key and the Resend sandbox sender', () => {
    const problems = productionProblems(
      prod({
        BETTER_AUTH_SECRET: 'replace-with-32+-random-bytes-xxxxxxxxxxxx',
        RESEND_API_KEY: '',
        EMAIL_FROM: 'PaiPai <onboarding@resend.dev>',
      }),
    ).join('\n');
    expect(problems).toMatch(/BETTER_AUTH_SECRET/);
    expect(problems).toMatch(/RESEND_API_KEY/);
    expect(problems).toMatch(/EMAIL_FROM/);
  });

  it('needs a cron secret when the in-process scheduler is off', () => {
    expect(
      productionProblems(prod({ DISABLE_SCHEDULER: '1', CRON_SECRET: '' })).join('\n'),
    ).toMatch(/CRON_SECRET is required/);
    expect(productionProblems(prod({ CRON_SECRET: 'short' })).join('\n')).toMatch(/24 characters/);
  });

  it('needs both Google values or neither', () => {
    expect(productionProblems(prod({ GOOGLE_CLIENT_ID: 'id' })).join('\n')).toMatch(/GOOGLE/);
    expect(
      productionProblems(prod({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' })),
    ).toEqual([]);
  });

  it('checks the cookie domain covers web and API hosts', () => {
    expect(productionProblems(prod({ COOKIE_DOMAIN: '' })).join('\n')).toMatch(
      /COOKIE_DOMAIN must cover both .* \(e\.g\. "\.paipai\.example\.in"\)/,
    );
    expect(productionProblems(prod({ COOKIE_DOMAIN: '.other.in' })).join('\n')).toMatch(
      /COOKIE_DOMAIN/,
    );
    // Unrelated hosts can never share a cookie.
    expect(
      productionProblems(
        prod({
          WEB_URL: 'https://paipai.vercel.app',
          BETTER_AUTH_URL: 'https://paipai.onrender.com',
        }),
      ).join('\n'),
    ).toMatch(/must be subdomains of one domain/);
    // Same host needs no cookie domain.
    expect(
      productionProblems(
        prod({
          WEB_URL: 'https://paipai.example.in',
          BETTER_AUTH_URL: 'https://paipai.example.in',
          COOKIE_DOMAIN: '',
        }),
      ),
    ).toEqual([]);
  });

  it('drops development deep-link origins in production', () => {
    const origins = trustedOrigins(prod({ EXTRA_TRUSTED_ORIGINS: 'https://preview.example.in, ' }));
    expect(origins).toEqual([
      'https://paipai.example.in',
      'paipai://',
      'https://preview.example.in',
    ]);
    expect(origins).not.toContain('exp://');
  });
});

describe('health and CORS', () => {
  let t: TestCtx;
  beforeAll(async () => {
    t = await setup();
  });
  afterAll(async () => {
    await t.close();
  });

  it('readiness checks the database', async () => {
    const r = await t.call<{ ok: boolean; db: string }>('/health/ready');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, db: 'up' });
  });

  it('allows the web origin with credentials and ignores unknown origins', async () => {
    const ok = await t.call('/api/me', { headers: { origin: 'http://localhost:3000' } });
    expect(ok.res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    expect(ok.res.headers.get('access-control-allow-credentials')).toBe('true');
    const evil = await t.call('/api/me', { headers: { origin: 'https://evil.example' } });
    expect(evil.res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
