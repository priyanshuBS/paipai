# PaiPai — _Paai-paai ka hisaab_

Personal finance and expense tracking for India (₹ INR, Asia/Kolkata). PaiPai has:

- a **Next.js website**
- an **Expo mobile app**
- one **Hono API** and one **Neon Postgres** database, shared by both

> Status: **Phase 2 done**: monorepo, database, and the API (auth, transactions, categories, analytics). The web and mobile apps come in Phases 3–5.

## Repo layout

```
apps/
  api/        Hono REST API + Better Auth          (Phase 2)
  web/        Next.js App Router website            (Phase 3)
  mobile/     Expo Router app                       (Phase 4)
packages/
  config/     shared tsconfig, ESLint, Prettier
  shared/     Zod schemas, types, design tokens, money (paise) + timezone date helpers, default categories
  db/         Drizzle schema, Neon client, SQL migrations, seed, PGlite test harness
```

## Principles

- **Money is integer paise.** For example, ₹30 is stored as `3000` (Postgres `bigint`, `CHECK amount > 0`). User input is parsed from strings, never through floats.
- **Timestamps are UTC.** Day, week, month and year buckets are computed in SQL with `date_trunc(... AT TIME ZONE <user tz>)`. Weeks start on Monday.
- **Every request is validated** with the Zod schemas in `@paipai/shared`.

## Prerequisites

- Node.js ≥ 20.18 (developed on 24)
- pnpm 10: `npm i -g pnpm@10`

## Setup

```bash
pnpm install
cp packages/db/.env.example packages/db/.env   # then fill DATABASE_URL
pnpm db:migrate                                 # apply SQL migrations to Neon
pnpm db:seed                                    # insert default categories
```

See **[docs/SETUP-KEYS.md](docs/SETUP-KEYS.md)** for step-by-step instructions on getting each key (Neon, Google OAuth, Resend, R2).

## Scripts

| Command            | What it does                                                            |
| ------------------ | ----------------------------------------------------------------------- |
| `pnpm typecheck`   | Strict TypeScript across all workspaces                                 |
| `pnpm lint`        | ESLint (flat config, no `any`)                                          |
| `pnpm test`        | Vitest unit + DB tests (DB tests use in-process PGlite, no Neon needed) |
| `pnpm db:generate` | Generate a new SQL migration after editing the Drizzle schema           |
| `pnpm db:migrate`  | Apply migrations to `DATABASE_URL`                                      |
| `pnpm db:seed`     | Upsert system categories (idempotent)                                   |
| `pnpm db:studio`   | Open Drizzle Studio                                                     |
| `pnpm format`      | Prettier                                                                |

## Database

| Table                                                  | Notes                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `users`                                                | Better Auth user, plus `currency`, `timezone`, `monthly_budget` (paise), `theme`    |
| `sessions`, `accounts`, `verifications`, `rate_limits` | Better Auth tables                                                                  |
| `categories`                                           | `user_id NULL` means a system default; system rows have a stable `key`              |
| `transactions`                                         | paise `amount`, `type`, `payment_method`, `tags text[]`, soft delete (`deleted_at`) |
| `budgets`                                              | overall (`category_id NULL`) or per category; one per user/category/period          |
| `recurring_transactions`                               | template + `frequency` + `next_run_at`                                              |
| `push_tokens`                                          | Expo push tokens for budget alerts                                                  |

Indexes: `(user_id, occurred_at desc)`, `(user_id, category_id)`, `(user_id, lower(title))`, GIN on `tags`, and a partial index on active recurring `next_run_at`.

Deleting a user cascades and removes all of their data.

## API (apps/api)

```bash
pnpm --filter @paipai/api dev     # http://localhost:8787 (reads the repo-root .env)
```

All routes are under `/api` and require a session, except `/api/auth/*` and `/health`. Errors use the shape `{ error: { code, message, details? } }`. Amounts are paise.

| Route                                                                                              | Purpose                                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/auth/email-otp/send-verification-otp`                                                   | Send a 6-digit OTP. 60s resend cooldown and an hourly limit per email; IP limits too                                                       |
| `POST /api/auth/sign-in/email-otp`                                                                 | Verify the OTP. New emails must include `name` (otherwise `NAME_REQUIRED`). Locks after 5 wrong attempts; codes expire in 10 min           |
| `POST /api/auth/sign-in/social`                                                                    | Google OAuth (`{ provider: "google" }`). Links to an existing account with the same email                                                  |
| `POST /api/auth/sign-out`, `POST /api/auth/revoke-sessions`                                        | Log out, or log out from all devices                                                                                                       |
| `GET / PATCH / DELETE /api/me`                                                                     | Profile and preferences; DELETE removes the account and all its data                                                                       |
| `GET / POST /api/transactions`                                                                     | Filters: `q, from, to, type, categoryId, paymentMethod, tags, minAmount, maxAmount, sort, cursor, limit`. Responses include per-day totals |
| `GET / PATCH / DELETE /api/transactions/:id`                                                       | Soft delete; undo with `POST /:id/restore`; `POST /:id/duplicate` copies a transaction                                                     |
| `GET /api/transactions/titles?q=`                                                                  | Autocomplete with last-used category and payment method                                                                                    |
| `GET / POST /api/categories`, `PATCH / DELETE /api/categories/:id`, `POST /api/categories/reorder` | Custom categories. Default categories are read-only; deleting a category that's in use archives it instead                                 |
| `GET /api/analytics/summary`                                                                       | Totals, net, % change vs the previous period, and today / this week / this month                                                           |
| `GET /api/analytics/timeseries`                                                                    | Day, week or month buckets; empty buckets are filled with zero                                                                             |
| `GET /api/analytics/categories`, `/items`, `/items/:title`                                         | Category breakdown, item-wise totals, and item history                                                                                     |
| `GET /api/analytics/payment-methods`, `/patterns`                                                  | Payment-method split, plus day-of-week and hour-of-day spending                                                                            |

Range queries take `period=day|week|month|year&date=YYYY-MM-DD`, or `period=custom&from=&to=`. All bucketing is done in the user's timezone.

**Cookies:** the web app and the API must be on the same site, because session cookies are `SameSite=Lax`. Locally that's `localhost:3000` and `localhost:8787`. In production use subdomains of one domain, e.g. `paipai.app` and `api.paipai.app`. The mobile app sends its session via Better Auth's Expo plugin and stores it in SecureStore.
