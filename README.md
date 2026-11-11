# PaiPai — _Paai-paai ka hisaab_

Personal finance and expense tracking for India (₹ INR, Asia/Kolkata). PaiPai has:

- a **Next.js website**
- an **Expo mobile app**
- one **Hono API** and one **Neon Postgres** database, shared by both

> Status: **Phase 1 done** (monorepo, shared packages, Drizzle schema, migrations, seed). The API, web app and mobile app arrive in Phases 2–5.

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
