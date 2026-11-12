# PaiPai — _Paai-paai ka hisaab_

[![CI](https://github.com/priyanshuBS/paipai/actions/workflows/ci.yml/badge.svg)](https://github.com/priyanshuBS/paipai/actions/workflows/ci.yml)

Personal finance and expense tracking, built for India (₹ INR, Asia/Kolkata by default). Log an expense in two taps, see where your money goes, and stay inside your budgets: on the web and on your phone.

- **Website**: Next.js 16 (App Router), Tailwind CSS, Recharts
- **Mobile app**: Expo SDK 58 (Android + iOS), Expo Router, NativeWind
- **API**: Hono + Better Auth (email OTP + Google), one API shared by both apps
- **Database**: Neon Postgres with Drizzle ORM

## Features

| Area                 | What you get                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sign-in**          | Email + 6-digit OTP (no passwords) or Continue with Google. Codes expire in 10 minutes, lock after 5 wrong tries, and have resend cooldowns.                                             |
| **Quick Add**        | Amount, title with autocomplete (remembers the category and payment method), category grid, UPI/Card/Cash/Bank chips, date, expense or income. **N** on the web, centre **+** on mobile. |
| **Transactions**     | Grouped by day with daily totals, search, filters, sort, infinite scroll, edit, duplicate, delete with Undo.                                                                             |
| **Analytics**        | Day / week / month / year / custom periods, % change, trend charts, categories, item-wise totals and history, payment methods, day-of-week and hour patterns, 12-month overview.         |
| **Budgets**          | Overall or per category, weekly / monthly / yearly. Alerts at your threshold (80% by default) and at 100%, once per period, as in-app toasts and push notifications.                     |
| **Recurring**        | Rent, SIPs, subscriptions: daily to yearly. Missed runs are caught up, month-ends handled (31 Jan → 29 Feb → 31 Mar), never duplicated.                                                  |
| **Reports & export** | Monthly summary, CSV (opens cleanly in Excel) and a branded PDF statement.                                                                                                               |
| **Personalisation**  | Custom categories (icon + colour, reorder, archive), currency, timezone, light/dark theme synced to your account.                                                                        |
| **Mobile extras**    | Works offline (queued and synced later, without duplicates), Face ID / fingerprint lock, daily reminder, receipt photos.                                                                 |

## Quick start

**Prerequisites:** Node.js ≥ 20.18 (developed on 24) and pnpm 10 (`npm i -g pnpm@10`).

```bash
pnpm install
cp .env.example .env     # then fill in the values: see docs/SETUP-KEYS.md
pnpm db:migrate          # create tables in Neon
pnpm db:seed             # default categories
```

Then run each in its own terminal:

```bash
pnpm --filter @paipai/api dev       # API on http://localhost:8787
pnpm --filter @paipai/web dev       # website on http://localhost:3000
pnpm --filter @paipai/mobile start  # Expo: scan the QR code with Expo Go
```

**No keys yet?** `pnpm --filter @paipai/api dev:local` runs the API on in-memory Postgres (PGlite) and prints OTP codes in the terminal instead of emailing them. Nothing touches Neon or Resend, and the data resets when you stop it.

📄 **[docs/SETUP-KEYS.md](docs/SETUP-KEYS.md)**: which keys you need and where to get them (Neon, Better Auth, Google, Resend, R2).
🚀 **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: production on Vercel + Render + EAS, step by step.

## Repo layout

```
apps/
  api/        Hono REST API + Better Auth, scheduler, PDF/CSV export   → Render / Docker
  web/        Next.js website                                         → Vercel
  mobile/     Expo app                                                → EAS Build
packages/
  shared/     Zod schemas, typed API client, money (paise) + timezone helpers, design tokens, categories
  db/         Drizzle schema, migrations, seed, SQL helpers, PGlite test harness
  config/     shared tsconfig + ESLint
e2e/          headless browser walkthroughs of the website
docs/         keys + deployment guides
```

## Scripts

| Command                                     | What it does                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm turbo run lint typecheck test build`  | Everything CI runs (except E2E)                                          |
| `pnpm test`                                 | Unit + database tests (in-process PGlite: no Neon or keys needed)        |
| `pnpm e2e`                                  | Browser E2E (build the website first: `pnpm --filter @paipai/web build`) |
| `pnpm lint` / `pnpm typecheck`              | ESLint (no `any`) / strict TypeScript                                    |
| `pnpm format` / `pnpm format:check`         | Prettier                                                                 |
| `pnpm db:generate`                          | New SQL migration after editing the Drizzle schema                       |
| `pnpm db:migrate` / `pnpm db:seed`          | Apply migrations / upsert default categories (idempotent)                |
| `pnpm db:studio`                            | Drizzle Studio                                                           |
| `pnpm --filter @paipai/mobile doctor`       | expo-doctor                                                              |
| `pnpm --filter @paipai/mobile bundle:check` | Metro bundle for Android + iOS                                           |

## Testing

| Layer    | What's covered                                                                                                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared` | Money parsing and formatting (paise, never floats), timezone period math, recurrence rules, schemas                                                                                                                    |
| `db`     | Schema constraints, cascades and SQL helpers on a real Postgres engine (PGlite)                                                                                                                                        |
| `api`    | Every route end-to-end through Hono: OTP limits and lockout, sessions, ownership checks, analytics in the user's timezone, budget alerts, concurrent recurring runs, export, cron auth, CORS, production config checks |
| `mobile` | Chart geometry, offline queue (ordering, idempotent replay, 401/4xx handling)                                                                                                                                          |
| `e2e`    | 26 browser steps: sign-up with OTP, quick add, autocomplete, transactions, analytics, item detail, budgets and alerts, recurring, categories, CSV/PDF export, settings, dark mode, phone layout                        |

The E2E runner starts the sandbox API itself (and `next start` if the website isn't already running), uses the installed Edge (Windows) or Chrome, and saves screenshots to `e2e/.output/`. Set `E2E_BROWSER_PATH` to use another Chromium browser.

## How it works

- **Money is integer paise.** ₹30 is stored as `3000` (`bigint`, `CHECK amount > 0`). Input is parsed from strings, never through floats.
- **Timestamps are UTC**, and every day / week / month bucket is computed in SQL in the user's timezone. Weeks start on Monday.
- **Everything is validated** with the Zod schemas in `@paipai/shared`, used by the API and both apps. The apps share one typed API client.
- **Sessions:** HTTP-only cookies on the web (`SameSite=Lax`, so web and API share one domain in production) and SecureStore on mobile via Better Auth's Expo plugin.
- **Safety:** rate limits per IP and per email, ownership checks on every row, soft deletes with undo, formula-injection-safe CSV, uploads restricted to your own bucket folder, security headers, structured JSON logs with request IDs, and an API that refuses to start with an unsafe production config.

## Database

| Table                                                  | Notes                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `users`                                                | Better Auth user + `currency`, `timezone`, `monthly_budget` (paise), `theme`                |
| `sessions`, `accounts`, `verifications`, `rate_limits` | Better Auth                                                                                 |
| `categories`                                           | `user_id NULL` = system default with a stable `key`; custom ones can be archived            |
| `transactions`                                         | paise `amount`, `type`, `payment_method`, `tags text[]`, receipt URL, soft delete           |
| `budgets`                                              | overall (`category_id NULL`) or per category; `last_alert_level` for once-per-period alerts |
| `recurring_transactions`                               | template + `frequency` + `next_run_at`                                                      |
| `push_tokens`                                          | Expo push tokens                                                                            |

Indexes: `(user_id, occurred_at desc)`, `(user_id, category_id)`, `(user_id, lower(title))`, GIN on `tags`, and a partial index on active recurring `next_run_at`. Deleting a user removes all of their data.

## API reference

All routes are under `/api` and need a session, except `/api/auth/*`, `/health`, `/health/ready` and the cron endpoint. Errors look like `{ "error": { "code", "message", "details?" } }`. Amounts are paise.

| Route                                                                                                      | Purpose                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/email-otp/send-verification-otp`                                                           | Send a sign-in code (60s cooldown + hourly limit per email, IP limits)                                                                                  |
| `POST /api/auth/sign-in/email-otp`                                                                         | Verify the code; new emails must include `name` (`NAME_REQUIRED`)                                                                                       |
| `POST /api/auth/sign-in/social`                                                                            | Google (`{ provider: "google" }`), linked by email                                                                                                      |
| `POST /api/auth/sign-out`, `/api/auth/revoke-sessions`                                                     | Log out / log out everywhere                                                                                                                            |
| `GET · PATCH · DELETE /api/me`                                                                             | Profile and preferences; DELETE removes the account and all data                                                                                        |
| `GET · POST /api/transactions`                                                                             | List (`q, from, to, type, categoryId, paymentMethod, tags, minAmount, maxAmount, sort, cursor, limit`) with day totals; create (idempotent client `id`) |
| `GET · PATCH · DELETE /api/transactions/:id`, `POST /:id/restore`, `/:id/duplicate`                        | Single transaction; soft delete and undo                                                                                                                |
| `GET /api/transactions/titles?q=`                                                                          | Autocomplete with last-used category and payment method                                                                                                 |
| `GET · POST /api/categories`, `PATCH · DELETE /:id`, `POST /reorder`                                       | Custom categories (in-use ones are archived, not deleted)                                                                                               |
| `GET /api/analytics/summary · timeseries · categories · items · items/:title · payment-methods · patterns` | All in the user's timezone. Ranges: `period=day\|week\|month\|year&date=` or `period=custom&from=&to=`                                                  |
| `GET · POST /api/budgets`, `PATCH · DELETE /:id`                                                           | Budgets with live progress                                                                                                                              |
| `GET · POST /api/recurring`, `PATCH · DELETE /:id`                                                         | Recurring rules (pause / resume via PATCH)                                                                                                              |
| `GET /api/reports/monthly?month=YYYY-MM`                                                                   | Monthly report                                                                                                                                          |
| `GET /api/export?format=csv\|pdf&from=&to=`                                                                | Download CSV or PDF statement                                                                                                                           |
| `GET /api/uploads/config`, `POST /api/uploads/presign`                                                     | Receipt / avatar upload to R2 (hidden when R2 isn't configured)                                                                                         |
| `POST · DELETE /api/push-tokens`                                                                           | Register / remove a device for push                                                                                                                     |
| `POST /api/cron/recurring`                                                                                 | Run due recurring transactions (`Authorization: Bearer $CRON_SECRET`)                                                                                   |
| `GET /health`, `GET /health/ready`                                                                         | Liveness / readiness (checks the database)                                                                                                              |

## Mobile app notes

- In development the app finds the API at `http://<your computer's LAN IP>:8787` automatically (same host as the Expo dev server). Phone and computer must be on the **same Wi-Fi**, and Windows Firewall must allow Node.js on private networks.
- **Email OTP** works in Expo Go. **Google sign-in**, **push notifications** and PaiPai's own Face ID prompt need the deployed HTTPS API and an EAS build: see [DEPLOYMENT.md §6](docs/DEPLOYMENT.md#6-mobile-app-with-eas-build).
- App id `com.paipai.app`, URL scheme `paipai://`.

## Notes for this codebase

- Tailwind CSS **v3** on purpose: v4 needs a native `.node` binary, which Windows Application Control blocks on the development machine.
- React is pinned to one version across the workspace (`pnpm.overrides`); Expo breaks with two copies. `node-linker=hoisted` is required by Expo.
- TypeScript is pinned to `~6.0` until typescript-eslint supports newer versions.
