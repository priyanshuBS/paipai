import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import {
  accounts,
  eq,
  rateLimits,
  sessions,
  sql,
  users,
  verifications,
  type Database,
} from '@paipai/db';
import { isValidTimeZone } from '@paipai/shared/date';
import {
  OTP_EXPIRES_IN_SECONDS,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  emailSchema,
  nameSchema,
} from '@paipai/shared/schemas';
import type { Mailer } from './email/mailer';
import { trustedOrigins, type Env } from './env';
import { hitDbLimit } from './lib/rate-limit';

/** Max OTP emails per address per hour (on top of the 60s resend cooldown). */
const OTP_HOURLY_LIMIT = 8;

export interface CreateAuthOptions {
  env: Env;
  db: Database;
  mailer: Mailer;
}

export function createAuth({ env, db, mailer }: CreateAuthOptions) {
  const isProd = env.NODE_ENV === 'production';
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: 'select_account' as const,
          },
        }
      : undefined;

  return betterAuth({
    appName: 'PaiPai',
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(env),
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        rateLimit: rateLimits,
      },
    }),
    user: {
      additionalFields: {
        currency: { type: 'string', required: false, defaultValue: 'INR', input: false },
        // Clients may send the device timezone at signup; validated in the before-hook.
        timezone: { type: 'string', required: false, defaultValue: 'Asia/Kolkata', input: true },
        monthlyBudget: { type: 'number', required: false, input: false },
        theme: { type: 'string', required: false, defaultValue: 'system', input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh daily
    },
    account: {
      accountLinking: {
        enabled: true,
        // Google verifies email ownership, so link it to an existing OTP account with the same email.
        trustedProviders: ['google', 'email-otp'],
      },
    },
    ...(google ? { socialProviders: google } : {}),
    emailAndPassword: { enabled: false },
    rateLimit: {
      enabled: env.NODE_ENV !== 'test',
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/email-otp/send-verification-otp': { window: 60, max: 5 },
        '/sign-in/email-otp': { window: 60, max: 10 },
      },
    },
    advanced: {
      cookiePrefix: 'paipai',
      useSecureCookies: isProd,
      ...(env.COOKIE_DOMAIN
        ? { crossSubDomainCookies: { enabled: true, domain: env.COOKIE_DOMAIN } }
        : {}),
      defaultCookieAttributes: { sameSite: 'lax', httpOnly: true, secure: isProd },
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'] },
    },
    plugins: [
      expo(),
      emailOTP({
        otpLength: OTP_LENGTH,
        expiresIn: OTP_EXPIRES_IN_SECONDS,
        allowedAttempts: OTP_MAX_ATTEMPTS,
        storeOTP: 'hashed',
        sendVerificationOTP: async ({ email, otp, type }) => {
          await mailer.sendOtp({ email, otp, purpose: type });
        },
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/email-otp/send-verification-otp') {
          const parsed = emailSchema.safeParse(
            (ctx.body as { email?: unknown } | undefined)?.email,
          );
          if (!parsed.success) {
            throw new APIError('BAD_REQUEST', {
              code: 'INVALID_EMAIL',
              message: 'Enter a valid email',
            });
          }
          const email = parsed.data;
          const cooldown = await hitDbLimit(
            db,
            `otp:cooldown:${email}`,
            OTP_RESEND_COOLDOWN_SECONDS * 1000,
            1,
          );
          if (!cooldown.allowed) {
            throw new APIError('TOO_MANY_REQUESTS', {
              code: 'OTP_COOLDOWN',
              message: `Please wait ${Math.ceil(cooldown.retryAfterMs / 1000)}s before requesting a new code`,
              retryAfterSeconds: Math.ceil(cooldown.retryAfterMs / 1000),
            });
          }
          const hourly = await hitDbLimit(
            db,
            `otp:hourly:${email}`,
            60 * 60 * 1000,
            OTP_HOURLY_LIMIT,
          );
          if (!hourly.allowed) {
            throw new APIError('TOO_MANY_REQUESTS', {
              code: 'OTP_LIMIT',
              message: 'Too many codes requested for this email. Please try again later.',
              retryAfterSeconds: Math.ceil(hourly.retryAfterMs / 1000),
            });
          }
          return { context: { body: { ...(ctx.body as object), email } } };
        }

        if (ctx.path === '/sign-in/email-otp') {
          const body = (ctx.body ?? {}) as { email?: unknown; name?: unknown; timezone?: unknown };
          const parsedEmail = emailSchema.safeParse(body.email);
          if (!parsedEmail.success) {
            throw new APIError('BAD_REQUEST', {
              code: 'INVALID_EMAIL',
              message: 'Enter a valid email',
            });
          }
          const email = parsedEmail.data;
          if (
            body.timezone !== undefined &&
            (typeof body.timezone !== 'string' || !isValidTimeZone(body.timezone))
          ) {
            throw new APIError('BAD_REQUEST', {
              code: 'INVALID_TIMEZONE',
              message: 'Invalid timezone',
            });
          }
          const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(sql`lower(${users.email})`, email))
            .limit(1);
          if (!existing) {
            // Name is required to create an account.
            const name = nameSchema.safeParse(body.name);
            if (!name.success) {
              throw new APIError('BAD_REQUEST', {
                code: 'NAME_REQUIRED',
                message: 'No account found for this email. Please sign up with your name.',
              });
            }
            return { context: { body: { ...(ctx.body as object), email, name: name.data } } };
          }
          return { context: { body: { ...(ctx.body as object), email } } };
        }
        return undefined;
      }),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;
export type AuthUser = AuthSession['user'];
