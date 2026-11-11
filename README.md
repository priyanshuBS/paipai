# PaiPai — _Paai-paai ka hisaab_

Personal finance and expense tracking for India (₹ INR, Asia/Kolkata). PaiPai has:

- a **Next.js website**
- an **Expo mobile app**
- one **Hono API** and one **Neon Postgres** database, shared by both

> Status: **Phase 5 done**: everything from Phases 1–4, plus budgets with alerts, recurring transactions, categories management, CSV/PDF export and monthly reports, settings (currency, timezone, theme synced to your account), receipts (when R2 is configured), and on mobile: a daily reminder, biometric app lock and an offline queue. Phase 6 covers tests, polish and deployment.

## Phase 5 features

| Feature               | How it works                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Budgets**           | Overall or per-category, weekly/monthly/yearly. Progress is computed in SQL for the current period in the user's timezone. Saving an expense returns `budgetAlerts` when a budget crosses its threshold (default 80%) or 100%. Each level fires **once per period**, recorded atomically, and is also sent as an **Expo push** to the user's devices. The overall monthly budget stays in sync with `users.monthly_budget`.                                                    |
| **Recurring**         | Rules with daily/weekly/monthly/yearly frequency. Dates are computed from the original start, so a rule on the 31st lands on 29 Feb and then 31 Mar. The runner creates missed occurrences (capped) and locks rows with `FOR UPDATE SKIP LOCKED`, so concurrent runs never double-create. It runs in-process every 10 minutes, and `POST /api/cron/recurring` (with `Authorization: Bearer $CRON_SECRET`) is available for serverless hosts (set `DISABLE_SCHEDULER=1` there). |
| **Export**            | `GET /api/export?format=csv\|pdf&from=&to=`. CSV has a UTF-8 BOM for Excel, negative expenses, and formula-injection guarding. The PDF is a branded statement with Inter embedded (so ₹ renders), a summary, a category breakdown and the transaction table.                                                                                                                                                                                                                   |
| **Reports**           | `GET /api/reports/monthly?month=YYYY-MM` gives totals, % change, daily chart, categories, top items, monthly budgets, the biggest expense and the per-day average.                                                                                                                                                                                                                                                                                                             |
| **Receipts / avatar** | `POST /api/uploads/presign` returns a presigned R2 `PUT` URL (images only, max 5 MB, stored in a per-user folder). The API only accepts receipt/avatar URLs that point at your own bucket and folder. **Hidden entirely when the `R2_*` variables are empty.**                                                                                                                                                                                                                 |
| **Mobile extras**     | Daily reminder (local notification, configurable time; tapping it opens Quick Add). Biometric app lock (locks on launch and after 30s in the background). Offline queue: new expenses saved with no signal are stored with a client UUID and replayed idempotently when the connection returns.                                                                                                                                                                                |

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

## Running locally

```bash
pnpm --filter @paipai/api dev        # API on http://localhost:8787 (Neon + Resend from the repo-root .env)
pnpm --filter @paipai/web dev        # Website on http://localhost:3000
```

**Offline sandbox:** `pnpm --filter @paipai/api dev:local` runs the API on in-memory Postgres (PGlite). OTP codes are printed to the terminal instead of emailed. It doesn't touch Neon or Resend, and the data resets when you stop it.

## Mobile app (apps/mobile)

Built with Expo SDK 58, Expo Router, NativeWind 4 (Tailwind v3), TanStack Query (with the cache persisted to AsyncStorage), Better Auth's Expo plugin (session kept in `expo-secure-store`), and `react-native-svg` charts. App name **PaiPai**, scheme `paipai`, bundle/package id `com.paipai.app`.

```bash
pnpm --filter @paipai/api dev          # terminal 1: API (must be running)
pnpm --filter @paipai/mobile start     # terminal 2: Expo, then scan the QR code with Expo Go
```

- Your phone and computer must be on the **same Wi-Fi**. In development the app reaches the API at `http://<your-computer's-LAN-IP>:8787` automatically, using the same host as the Expo dev server. To use a different API, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`.
- If Windows Firewall asks whether to let Node.js accept connections, allow it on **Private networks**.
- **Email OTP** works on a phone over Wi-Fi. **Google sign-in on a phone** needs the API on a public HTTPS URL, because Google redirects to `BETTER_AUTH_URL`, and `localhost` on your phone isn't your computer. It will work once the API is deployed (Phase 6), or through a tunnel such as `cloudflared` or ngrok, with the tunnel URL added to the Google OAuth client.

| Screen                       | What it does                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Onboarding                   | 3 illustrated slides, then **Get Started**, or "Already have an account? Login"                                                                                                                  |
| Sign up / Log in / Verify    | Name + email, then the 6-digit OTP (autofill, 60s resend timer); Continue with Google                                                                                                            |
| Home                         | Greeting, balance card (hide/show, count-up), today/week/month, budget bar, quick actions, recent activity                                                                                       |
| Quick Add (centre **+** tab) | ₹ amount with numeric keypad, title autocomplete (fills in the category), note, category grid, payment chips, Today/Yesterday + date-time picker, expense/income; haptic on save                 |
| Transactions                 | Grouped by day with daily totals, search, filter & sort sheet, pull to refresh, infinite scroll, swipe left to edit/delete (with Undo)                                                           |
| Analytics                    | Day/Week/Month/Year/Custom, "Nov 2026" month picker, % change, area chart, weekly bars, category donut, item-wise totals with item detail, payment methods, day/hour patterns, 12-month overview |
| Budgets                      | Monthly budget progress (amber at 80%, red at 100%) and this month by category                                                                                                                   |
| Profile                      | Account details, Light/Dark/System theme, log out, log out from all devices, delete account                                                                                                      |

Checks: `pnpm --filter @paipai/mobile typecheck`, `lint`, `test`, `doctor` (expo-doctor) and `bundle:check` (Metro bundle for Android + iOS).

## Website (apps/web)

This is a pure Next.js 16 App Router app (no Expo, no react-native-web) using Tailwind CSS, Radix-based shadcn-style components, Recharts and TanStack Query.

| Route                          | What it is                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                            | Marketing landing page: lime hero, features, app mockups, FAQ, footer. Has SEO metadata, an Open Graph image and a favicon                      |
| `/signup`, `/login`            | Email + 6-digit OTP (name required at sign-up, 60s resend timer), or Continue with Google                                                       |
| `/app`                         | Dashboard: balance card with hide/show and count-up, today/week/month, budget bar (amber at 80%, red at 100%), recent activity                  |
| `/app/transactions`            | Grouped by day with daily totals, plus search, filters, sorting, infinite scroll, edit/duplicate/delete with Undo                               |
| `/app/analytics`               | Day/Week/Month/Year/Custom, % change, area/bar/donut charts, item-wise totals, top 5, payment methods, day and hour patterns, 12-month overview |
| `/app/analytics/items/[title]` | History of a single item                                                                                                                        |
| `/app/welcome`                 | Optional monthly budget after sign-up                                                                                                           |

**Quick Add** opens with the **N** key (or the + buttons). It has the amount field, title autocomplete (fills in the last-used category), note, category grid, payment chips, a Today/Yesterday date picker, and an expense/income toggle.

`/app/*` is protected by `src/proxy.ts` (an optimistic cookie check); the API still verifies every request. Every chart card has a "view as table" toggle. Category colours in charts come from a colour-blind-validated palette (`chartColorFor` in `@paipai/shared/tokens`).

**Environment** (`apps/web/.env.local`, or set in Vercel):

```
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
```

Both default to the localhost URLs in development.

> **Note:** the site uses Tailwind CSS **v3** (pure JavaScript) on purpose. Tailwind v4 needs a native `.node` binary, and Windows Application Control blocks that binary on this machine, which silently produced empty CSS.

## API (apps/api)

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
