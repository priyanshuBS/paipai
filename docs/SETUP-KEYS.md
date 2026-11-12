# Getting your keys

PaiPai never ships real secrets. Copy `.env.example` to `.env` in the repo root and fill in the values below. The API and the database scripts both read that one file (it is gitignored). For production, the same names go into your host's settings: see [DEPLOYMENT.md](DEPLOYMENT.md).

## 1. Neon (`DATABASE_URL`)

1. Sign up at https://neon.tech and create a project. Choose region **AWS Asia Pacific (Singapore)** (`ap-southeast-1`), which is the closest to India.
2. Name the database `paipai`.
3. Open **Dashboard → Connect**. Pick the **Pooled connection** string and keep `?sslmode=require` on the end.
4. Put it in `.env` as `DATABASE_URL=...`.
5. From the repo root, run `pnpm db:migrate`, then `pnpm db:seed`.

## 2. Better Auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)

- Run `openssl rand -base64 32`. In PowerShell you can run `[Convert]::ToBase64String((1..32 | % {Get-Random -Max 256}))` instead. Paste the result as `BETTER_AUTH_SECRET`.
- `BETTER_AUTH_URL` is the API's public URL: `http://localhost:8787` locally, and your deployed API URL in production.

## 3. Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

Go to https://console.cloud.google.com and create (or select) a project called **PaiPai**.

**OAuth consent screen**: APIs & Services → OAuth consent screen

- User type **External**. App name **PaiPai**. Add your support email and logo.
- Scopes: `openid`, `email`, `profile`.
- While the app is in "Testing" mode, add yourself as a test user.

**Web client** (used by the API for both web and mobile, because Better Auth handles the redirect)

- Credentials → Create credentials → OAuth client ID → **Web application**.
- Authorized JavaScript origins: `http://localhost:3000`, plus your production web URL.
- Authorized redirect URIs: `http://localhost:8787/api/auth/callback/google`, plus `https://YOUR-API-DOMAIN/api/auth/callback/google`.
- Copy the **Client ID** and **Client secret** into `.env`.

**Mobile needs no extra Google client.** The app opens Google sign-in in a secure browser, and the flow goes through the API (Better Auth's Expo plugin, then back to the app via the `paipai://` deep link). Google only ever sees the **Web** client and the API's redirect URI, so the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` work for both the website and the app, on Android and iOS.

> Android/iOS OAuth clients (package / bundle ID `com.paipai.app`) are only needed if you later switch to the _native_ Google Sign-In SDK (the in-app account picker). PaiPai doesn't use it, so you can skip them.

## 4. Resend (`RESEND_API_KEY`, `EMAIL_FROM`)

1. Sign up at https://resend.com.
2. **Domains → Add domain**, then add the DNS records it shows (SPF, DKIM) with your DNS provider and wait for "Verified".
   - For quick local testing you can skip this and use `EMAIL_FROM="PaiPai <onboarding@resend.dev>"`. That address can only send to your own Resend account email.
3. **API Keys → Create API key** with "Sending access" permission. Copy it as `RESEND_API_KEY`.
4. Set `EMAIL_FROM="PaiPai <hello@yourdomain.com>"`, using an address on the domain you verified.

## 5. Cloudflare R2 (optional, for receipts)

1. In the Cloudflare dashboard, go to **R2 → Create bucket** and name it `paipai-receipts`.
2. **R2 → Manage R2 API Tokens → Create API token** with "Object Read & Write" access to that bucket. Copy the Access Key ID and Secret.
3. Your Account ID is shown on the R2 overview page.
4. Make files publicly readable: bucket **Settings → Public access**. Either enable the r2.dev URL or connect a custom domain. Use that URL as `R2_PUBLIC_URL`.
5. If you leave any `R2_*` variable empty, the receipt feature is hidden.

## 6. Cron secret (`CRON_SECRET`)

A long random string that protects `POST /api/cron/recurring`. Generate it the same way as `BETTER_AUTH_SECRET`. Only needed if something outside the API triggers recurring transactions (the GitHub Actions workflow, or a host with `DISABLE_SCHEDULER=1`).

## 7. Expo / EAS (mobile builds only)

- A free Expo account (https://expo.dev/signup). `eas init` in `apps/mobile` creates the project ID used for push notifications. Nothing goes in `.env`.
- Android push: a Firebase service-account JSON uploaded with `eas credentials` (see [DEPLOYMENT.md §6.2](DEPLOYMENT.md#62-android)).
- iOS builds: an Apple Developer Program membership.

## Summary

| Key                                        | Required?               | Where                            |
| ------------------------------------------ | ----------------------- | -------------------------------- |
| `DATABASE_URL`                             | yes                     | Neon → Connect (pooled)          |
| `BETTER_AUTH_SECRET`                       | yes                     | generate locally                 |
| `BETTER_AUTH_URL`, `WEB_URL`               | yes                     | your URLs                        |
| `RESEND_API_KEY`, `EMAIL_FROM`             | yes in production       | Resend → API Keys / Domains      |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google sign-in      | Google Cloud → Credentials (Web) |
| `R2_*` (5 values)                          | for receipts / avatars  | Cloudflare → R2                  |
| `CRON_SECRET`                              | for external cron       | generate locally                 |
| `COOKIE_DOMAIN`                            | production, split hosts | e.g. `.paipai.example.in`        |
