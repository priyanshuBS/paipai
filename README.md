# PaiPai

_Paai-paai ka hisaab._ An expense tracker for India.

[![CI](https://github.com/priyanshuBS/paipai/actions/workflows/ci.yml/badge.svg)](https://github.com/priyanshuBS/paipai/actions/workflows/ci.yml)

I built PaiPai because I wanted a simple way to keep track of where my money goes without handing a bank login or my SMS inbox to some app. You add what you spend (it takes a couple of seconds), and PaiPai turns that into budgets, trends and monthly reports. It runs on the web and on Android, and both stay in sync.

- Website: [paipai.priyanshusingh.co.in](https://paipai.priyanshusingh.co.in)
- Android app: [latest build on Expo](https://expo.dev/accounts/priyanshu69/projects/paipai/builds/0c1f1342-34f2-4b49-b7bf-a93be27f4576) (open it on your phone and tap Install, or scan the QR code)
- API: `https://api.paipai.priyanshusingh.co.in`

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Testing](#testing)
- [How it works](#how-it-works)
- [Database](#database)
- [API reference](#api-reference)
- [Mobile app](#mobile-app)
- [Development notes](#development-notes)
- [Author](#author)

## Features

- **Sign-in without passwords.** Email with a 6-digit code, or Continue with Google. Codes expire after 10 minutes, lock after 5 wrong tries, and have resend cooldowns.
- **Quick Add.** Amount, title with autocomplete (it remembers the category and payment method you used last time), category, UPI / Card / Cash / Bank, date, and expense or income. Press `N` on the web or the centre `+` on mobile.
- **Transactions.** Grouped by day with daily totals. Search, filter, sort, infinite scroll, edit, duplicate, and delete with undo.
- **Analytics.** Day, week, month, year or custom ranges, change vs. the previous period, trend charts, category breakdown, item-wise totals and history, payment methods, day-of-week and hour patterns, and a 12-month overview.
- **Budgets.** Overall or per category, weekly, monthly or yearly. You get an alert at your threshold (80% by default) and again at 100%, once per period, in the app and as a push notification.
- **Recurring transactions.** Rent, SIPs, subscriptions, anything from daily to yearly. Missed runs are caught up, month-ends are handled (31 Jan, then 29 Feb, then 31 Mar), and nothing is added twice.
- **Reports and export.** A monthly summary, a CSV that opens cleanly in Excel, and a PDF statement.
- **Personalisation.** Custom categories (icon, colour, order, archive), currency, timezone, and a light/dark theme saved to your account.
- **On the phone.** Works offline (entries are queued and synced later without duplicates), Face ID / fingerprint lock, a daily reminder, and receipt photos.
- **Made for India.** Rupees with Indian digit grouping (₹1,23,456), UPI as a proper payment method, and Asia/Kolkata time by default.

## Tech stack

| Part     | What it uses                                                 | Hosted on |
| -------- | ------------------------------------------------------------ | --------- |
| Website  | Next.js 16 (App Router), Tailwind CSS, Recharts              | Vercel    |
| Mobile   | Expo SDK 58, Expo Router, NativeWind                         | EAS Build |
| API      | Hono, Better Auth (email OTP + Google), shared by both apps  | Render    |
| Database | Postgres with Drizzle ORM                                    | Neon      |
| Shared   | pnpm + Turborepo monorepo, Zod schemas, one typed API client |           |

## Getting started

You need Node.js 20.18 or newer (I develop on 24) and pnpm 10 (`npm i -g pnpm@10`).

```bash
pnpm install
cp .env.example .env     # fill in the values, see docs/SETUP-KEYS.md
pnpm db:migrate          # create the tables in Neon
pnpm db:seed             # add the default categories
```

Then start each app in its own terminal:

```bash
pnpm --filter @paipai/api dev       # API on http://localhost:8787
pnpm --filter @paipai/web dev       # website on http://localhost:3000
pnpm --filter @paipai/mobile start  # Expo, scan the QR code with Expo Go
```

If you don't have any keys yet, run `pnpm --filter @paipai/api dev:local` instead. It starts the API on an in-memory Postgres (PGlite) and prints sign-in codes in the terminal instead of emailing them. Nothing touches Neon or Resend, and the data is gone when you stop it.

More detail:

- [docs/SETUP-KEYS.md](docs/SETUP-KEYS.md): which keys you need and where to get them (Neon, Better Auth, Google, Resend, R2)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): deploying to Vercel, Render and EAS, step by step

## Project structure

```
apps/
  api/        Hono REST API + Better Auth, scheduler, PDF/CSV export   (Render / Docker)
  web/        Next.js website                                         (Vercel)
  mobile/     Expo app                                                (EAS Build)
packages/
  shared/     Zod schemas, typed API client, money (paise) and timezone helpers, design tokens, categories
  db/         Drizzle schema, migrations, seed, SQL helpers, PGlite test harness
  config/     Shared tsconfig and ESLint config
e2e/          Headless browser walkthroughs of the website
docs/         Setup and deployment guides
```

## Scripts

| Command                                     | What it does                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm turbo run lint typecheck test build`  | Everything CI runs (except E2E)                                          |
| `pnpm test`                                 | Unit and database tests (in-process PGlite, no Neon or keys needed)      |
| `pnpm e2e`                                  | Browser E2E (build the website first: `pnpm --filter @paipai/web build`) |
| `pnpm lint` / `pnpm typecheck`              | ESLint (no `any`) / strict TypeScript                                    |
| `pnpm format` / `pnpm format:check`         | Prettier                                                                 |
| `pnpm db:generate`                          | New SQL migration after changing the Drizzle schema                      |
| `pnpm db:migrate` / `pnpm db:seed`          | Apply migrations / upsert default categories (safe to re-run)            |
| `pnpm db:studio`                            | Drizzle Studio                                                           |
| `pnpm --filter @paipai/mobile doctor`       | expo-doctor                                                              |
| `pnpm --filter @paipai/mobile bundle:check` | Metro bundle for Android and iOS                                         |

## Testing

| Package  | What's covered                                                                                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared` | Money parsing and formatting (paise, never floats), timezone period math, recurrence rules, schemas                                                                                                            |
| `db`     | Schema constraints, cascades and SQL helpers on a real Postgres engine (PGlite)                                                                                                                                |
| `api`    | Every route end to end through Hono: OTP limits and lockout, sessions, ownership checks, timezone-aware analytics, budget alerts, concurrent recurring runs, export, cron auth, CORS, production config checks |
| `mobile` | Chart geometry, offline queue (ordering, idempotent replay, 401/4xx handling)                                                                                                                                  |
| `e2e`    | 26 browser steps: sign-up with OTP, quick add, autocomplete, transactions, analytics, item detail, budgets and alerts, recurring, categories, CSV/PDF export, settings, dark mode, phone layout                |

The E2E runner starts the sandbox API by itself (and `next start` if the website isn't already running), uses the installed Edge (Windows) or Chrome, and saves screenshots to `e2e/.output/`. Set `E2E_BROWSER_PATH` to use a different Chromium browser.

- `pnpm e2e screens` seeds a realistic month of data and screenshots every page in light and dark mode, at desktop and phone widths.
- If your own API is already using port 8787, run on side ports: build the website with `NEXT_PUBLIC_API_URL=http://localhost:8788`, then run `E2E_API_PORT=8788 E2E_WEB_URL=http://localhost:3001 pnpm e2e`.

## How it works

- **Money is stored as integer paise.** ₹30 is saved as `3000` (`bigint`, `CHECK amount > 0`). Input is parsed from strings and never goes through floats.
- **Timestamps are UTC.** Day, week and month buckets are computed in SQL in the user's timezone. Weeks start on Monday.
- **Validation lives in one place.** The Zod schemas in `@paipai/shared` are used by the API and both apps, which also share one typed API client.
- **Sessions.** HTTP-only cookies on the web (`SameSite=Lax`, so the website and API share one domain in production) and SecureStore on mobile through Better Auth's Expo plugin.
- **Safety.** Rate limits per IP and per email, ownership checks on every row, soft deletes with undo, CSV that's safe from formula injection, uploads limited to your own folder in the bucket, security headers, structured JSON logs with request IDs, and an API that refuses to start with an unsafe production config.

## Database

| Table                                                  | Notes                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `users`                                                | Better Auth user plus `currency`, `timezone`, `monthly_budget` (paise), `theme`             |
| `sessions`, `accounts`, `verifications`, `rate_limits` | Better Auth                                                                                 |
| `categories`                                           | `user_id NULL` means a system default with a stable `key`; custom ones can be archived      |
| `transactions`                                         | Paise `amount`, `type`, `payment_method`, `tags text[]`, receipt URL, soft delete           |
| `budgets`                                              | Overall (`category_id NULL`) or per category; `last_alert_level` for once-per-period alerts |
| `recurring_transactions`                               | Template plus `frequency` and `next_run_at`                                                 |
| `push_tokens`                                          | Expo push tokens                                                                            |

Indexes: `(user_id, occurred_at desc)`, `(user_id, category_id)`, `(user_id, lower(title))`, GIN on `tags`, and a partial index on `next_run_at` for active recurring rules. Deleting a user deletes all of their data.

## API reference

All routes are under `/api` and need a session, except `/api/auth/*`, `/health`, `/health/ready` and the cron endpoint. Amounts are in paise. Errors have this shape:

```json
{ "error": { "code": "...", "message": "...", "details": "optional" } }
```

<details>
<summary>All routes</summary>

| Route                                                                                                      | Purpose                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/email-otp/send-verification-otp`                                                           | Send a sign-in code (60s cooldown and hourly limit per email, IP limits)                                                                                |
| `POST /api/auth/sign-in/email-otp`                                                                         | Verify the code; new emails must include `name` (`NAME_REQUIRED`)                                                                                       |
| `POST /api/auth/sign-in/social`                                                                            | Google (`{ provider: "google" }`), linked by email                                                                                                      |
| `POST /api/auth/sign-out`, `/api/auth/revoke-sessions`                                                     | Log out / log out everywhere                                                                                                                            |
| `GET · PATCH · DELETE /api/me`                                                                             | Profile and preferences; DELETE removes the account and all its data                                                                                    |
| `GET · POST /api/transactions`                                                                             | List (`q, from, to, type, categoryId, paymentMethod, tags, minAmount, maxAmount, sort, cursor, limit`) with day totals; create (idempotent client `id`) |
| `GET · PATCH · DELETE /api/transactions/:id`, `POST /:id/restore`, `/:id/duplicate`                        | Single transaction; soft delete and undo                                                                                                                |
| `GET /api/transactions/titles?q=`                                                                          | Autocomplete with last-used category and payment method                                                                                                 |
| `GET · POST /api/categories`, `PATCH · DELETE /:id`, `POST /reorder`                                       | Custom categories (ones in use are archived, not deleted)                                                                                               |
| `GET /api/analytics/summary · timeseries · categories · items · items/:title · payment-methods · patterns` | All in the user's timezone. Ranges: `period=day\|week\|month\|year&date=` or `period=custom&from=&to=`                                                  |
| `GET · POST /api/budgets`, `PATCH · DELETE /:id`                                                           | Budgets with live progress                                                                                                                              |
| `GET · POST /api/recurring`, `PATCH · DELETE /:id`                                                         | Recurring rules (pause and resume via PATCH)                                                                                                            |
| `GET /api/reports/monthly?month=YYYY-MM`                                                                   | Monthly report                                                                                                                                          |
| `GET /api/export?format=csv\|pdf&from=&to=`                                                                | Download a CSV or PDF statement                                                                                                                         |
| `GET /api/uploads/config`, `POST /api/uploads/presign`                                                     | Receipt / avatar upload to R2 (hidden when R2 isn't configured)                                                                                         |
| `POST · DELETE /api/push-tokens`                                                                           | Register / remove a device for push notifications                                                                                                       |
| `POST /api/cron/recurring`                                                                                 | Run due recurring transactions (`Authorization: Bearer $CRON_SECRET`)                                                                                   |
| `GET /health`, `GET /health/ready`                                                                         | Liveness / readiness (checks the database)                                                                                                              |

</details>

## Mobile app

- **Installing.** The latest Android build is on [Expo](https://expo.dev/accounts/priyanshu69/projects/paipai/builds/0c1f1342-34f2-4b49-b7bf-a93be27f4576). The first time, Android may ask you to allow installs from your browser.
- **Local development.** The app finds the API at `http://<your computer's LAN IP>:8787` on its own (the same host as the Expo dev server). Your phone and computer need to be on the same Wi-Fi, and Windows Firewall has to allow Node.js on private networks.
- **Expo Go vs. an EAS build.** Email sign-in works in Expo Go. Google sign-in, push notifications and the app's own Face ID prompt need the deployed HTTPS API and an EAS build. See [DEPLOYMENT.md, section 6](docs/DEPLOYMENT.md#6-mobile-app-with-eas-build).
- **Identifiers.** App id `com.paipai.app`, URL scheme `paipai://`.

## Development notes

- **Design system.** Neutral zinc surfaces, hairline borders, dark primary buttons and a single cobalt accent, all defined in `packages/shared/src/tokens.ts` and used by the website, the app, the PDF statement and the sign-in email. Green is for income, red is for over-budget and errors; normal spending is shown in regular text.
- **Tailwind CSS v3 on purpose.** v4 needs a native `.node` binary, which Windows Application Control blocks on my machine.
- **A single React version.** React is pinned across the workspace (`pnpm.overrides`) because Expo breaks with two copies. Expo also needs `node-linker=hoisted`.
- **TypeScript `~6.0`.** Pinned until typescript-eslint supports newer versions.

## Author

Made by Priyanshu Singh. You can find more of my work at [priyanshusingh.co.in](https://priyanshusingh.co.in) or on [GitHub](https://github.com/priyanshuBS).
