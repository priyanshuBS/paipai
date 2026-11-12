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
  const problems = productionProblems(parsed.data);
  if (problems.length) {
    throw new Error(
      `Invalid production configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    );
  }
  return parsed.data;
}

const PLACEHOLDER = /replace-with|xxxx/i;

/**
 * Mistakes that work locally but break (or are unsafe) once deployed.
 * Always empty outside production.
 */
export function productionProblems(env: Env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const problems: string[] = [];
  for (const name of ['BETTER_AUTH_URL', 'WEB_URL'] as const) {
    if (!env[name].startsWith('https://')) problems.push(`${name} must be an https:// URL`);
  }
  if (PLACEHOLDER.test(env.BETTER_AUTH_SECRET)) {
    problems.push('BETTER_AUTH_SECRET is still the placeholder; generate a real one');
  }
  if (!env.RESEND_API_KEY) problems.push('RESEND_API_KEY is required (sign-in codes are emailed)');
  if (/onboarding@resend\.dev/.test(env.EMAIL_FROM)) {
    problems.push('EMAIL_FROM must use your verified Resend domain, not onboarding@resend.dev');
  }
  if (env.DISABLE_SCHEDULER && !env.CRON_SECRET) {
    problems.push('CRON_SECRET is required when DISABLE_SCHEDULER=1, or recurring never runs');
  }
  if (env.CRON_SECRET && env.CRON_SECRET.length < 24) {
    problems.push('CRON_SECRET must be at least 24 characters');
  }
  if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET)) {
    problems.push('Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither');
  }
  // The website's route guard reads the session cookie the API sets,
  // so on different hosts the cookie domain must cover both.
  const webHost = new URL(env.WEB_URL).hostname;
  const apiHost = new URL(env.BETTER_AUTH_URL).hostname;
  if (webHost !== apiHost) {
    const domain = env.COOKIE_DOMAIN?.replace(/^\./, '');
    const covers = (host: string) => !!domain && (host === domain || host.endsWith(`.${domain}`));
    if (!covers(webHost) || !covers(apiHost)) {
      const parent = commonParent(webHost, apiHost);
      problems.push(
        parent
          ? `COOKIE_DOMAIN must cover both ${webHost} and ${apiHost} (e.g. ".${parent}")`
          : `WEB_URL (${webHost}) and BETTER_AUTH_URL (${apiHost}) must be subdomains of one domain you own, e.g. paipai.example.in and api.paipai.example.in`,
      );
    }
  }
  return problems;
}

/** Shared parent domain with at least two labels ("example.in"), or null. */
function commonParent(a: string, b: string): string | null {
  const pa = a.split('.').reverse();
  const pb = b.split('.').reverse();
  const out: string[] = [];
  for (const [i, label] of pa.entries()) {
    if (label !== pb[i]) break;
    out.push(label);
  }
  return out.length >= 2 ? out.reverse().join('.') : null;
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
