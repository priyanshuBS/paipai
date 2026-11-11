# Getting your keys

PaiPai never ships real secrets. Put the values below in the `.env` files (see `.env.example`).

## 1. Neon (`DATABASE_URL`)

1. Sign up at https://neon.tech and create a project. Choose region **AWS Asia Pacific (Singapore)** (`ap-southeast-1`), which is the closest to India.
2. Name the database `paipai`.
3. Open **Dashboard → Connect**. Pick the **Pooled connection** string and keep `?sslmode=require` on the end.
4. Put it in `packages/db/.env` and `apps/api/.env` as `DATABASE_URL=...`.
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
- Copy the **Client ID** and **Client secret** into `apps/api/.env`.

**Android client** (needed for production builds)

- Create credentials → OAuth client ID → **Android**.
- Package name: `com.paipai.app`.
- SHA-1: get it with `eas credentials` (Android → Keystore). For a local debug build, use `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`.

**iOS client** (needed for production builds)

- Create credentials → OAuth client ID → **iOS**.
- Bundle ID: `com.paipai.app`.

> On mobile, PaiPai sends Google sign-in through the API (Better Auth's Expo plugin and the `paipai://` deep link), so the **Web** client ID and secret are the only values the server needs. The Android and iOS clients just register the app's identity with Google.

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
