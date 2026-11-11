import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(8787),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.url(),
  API_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  WEB_URL: z.url(),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z.string().default('PaiPai <onboarding@resend.dev>'),
  CRON_SECRET: optionalString,
  /** Set to 1 on serverless hosts that use the cron endpoint instead. */
  DISABLE_SCHEDULER: z.preprocess((v) => v === '1' || v === 'true', z.boolean()).default(false),
  /** Extra comma-separated origins allowed for CORS / auth (e.g. preview deployments). */
  EXTRA_TRUSTED_ORIGINS: optionalString,
  /** e.g. ".paipai.app" so web (paipai.app) and API (api.paipai.app) share the session cookie. */
  COOKIE_DOMAIN: optionalString,
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET: optionalString,
  R2_PUBLIC_URL: optionalString,
});

export type Env = z.infer<typeof envSchema>;

/** Load .env (apps/api/.env first, then the repo root) and validate. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  config({
    path: [path.resolve(here, '../.env'), path.resolve(here, '../../../.env')],
    quiet: true,
  });
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  return parsed.data;
}

export function trustedOrigins(env: Env): string[] {
  const origins = [env.WEB_URL, 'paipai://'];
  if (env.NODE_ENV !== 'production') {
    // Expo Go / dev client deep links during development.
    origins.push('exp://', 'http://localhost:3000', 'http://localhost:8081');
  }
  if (env.EXTRA_TRUSTED_ORIGINS) {
    origins.push(
      ...env.EXTRA_TRUSTED_ORIGINS.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return [...new Set(origins)];
}
