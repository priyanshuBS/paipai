// PaiPai browser E2E runner.
//
//   pnpm --filter @paipai/web build   # once (the runner serves the production build)
//   pnpm e2e                          # all suites
//   pnpm e2e core                     # one suite
//
// Starts the sandbox API (PGlite + OTPs in the log; never touches Neon or Resend)
// and, unless one is already running on E2E_WEB_URL, `next start` for the website.
// Browser: E2E_BROWSER_PATH, or the installed Edge (Windows) / Chrome (elsewhere).
// Ports: E2E_API_PORT (default 8787) and E2E_WEB_URL (default http://localhost:3000).
// The website build must point at the same API port (NEXT_PUBLIC_API_URL).
// Screenshots, downloads and logs go to e2e/.output/.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createSuite } from './lib.mjs';
import * as core from './suites/core.mjs';
import * as money from './suites/money.mjs';
import * as screens from './suites/screens.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(here, '.output');
const API_PORT = process.env.E2E_API_PORT ?? '8787';
const API = `http://localhost:${API_PORT}`;
const WEB = (process.env.E2E_WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const requested = process.argv.slice(2);
// Opt-in suites (screens) run only when named: pnpm e2e screens
const suites = [core, money, screens].filter((s) =>
  requested.length ? requested.includes(s.name) : !s.optIn,
);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const children = [];
function start(label, args, env = {}) {
  const log = fs.openSync(path.join(outDir, `${label}.log`), 'w');
  // On Windows pnpm is a .cmd shim, which needs a shell; args here are fixed literals.
  const [cmd, cmdArgs] =
    process.platform === 'win32' ? [['pnpm', ...args].join(' '), []] : ['pnpm', args];
  const child = spawn(cmd, cmdArgs, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', log, log],
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
  });
  children.push(child);
  return child;
}
function stopAll() {
  for (const c of children) {
    if (c.exitCode !== null) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F']);
    else process.kill(-c.pid, 'SIGTERM');
  }
}
process.on('SIGINT', () => {
  stopAll();
  process.exit(130);
});

const isUp = async (url) => {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(2000) })).status < 500;
  } catch {
    return false;
  }
};
async function waitUntilUp(url, label, ms = 90_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await isUp(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} did not start; see e2e/.output/${label}.log`);
}

function launchOptions() {
  if (process.env.E2E_BROWSER_PATH) return { executablePath: process.env.E2E_BROWSER_PATH };
  return { channel: process.platform === 'win32' ? 'msedge' : 'chrome' };
}

let exitCode = 0;
try {
  if (await isUp(`${API}/health`)) {
    throw new Error(
      `Port ${API_PORT} is in use. Stop your dev API, or run with E2E_API_PORT=8788 (build the website with NEXT_PUBLIC_API_URL=http://localhost:8788).`,
    );
  }
  start('api', ['--filter', '@paipai/api', 'dev:local'], {
    NODE_ENV: 'development',
    PORT: API_PORT,
    DATABASE_URL: 'pglite://memory',
    BETTER_AUTH_SECRET: 'e2e-only-secret-e2e-only-secret-e2e-only',
    BETTER_AUTH_URL: API,
    WEB_URL: WEB,
    // Keep the sandbox self-contained even if a root .env exists.
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    R2_ACCOUNT_ID: '',
  });
  if (!(await isUp(WEB))) {
    if (!fs.existsSync(path.join(root, 'apps/web/.next/BUILD_ID'))) {
      throw new Error('No website build found. Run: pnpm --filter @paipai/web build');
    }
    start('web', [
      '--filter',
      '@paipai/web',
      'exec',
      'next',
      'start',
      '-p',
      new URL(WEB).port || '3000',
    ]);
  }
  await Promise.all([waitUntilUp(`${API}/health`, 'api'), waitUntilUp(WEB, 'web')]);

  const browser = await chromium.launch({ ...launchOptions(), headless: true });
  try {
    for (const suite of suites) {
      console.log(`\n${suite.name}`);
      const ctx = await browser.newContext({
        viewport: { width: 1360, height: 900 },
        timezoneId: 'Asia/Kolkata',
        locale: 'en-IN',
        acceptDownloads: true,
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        // 400 (wrong OTP) and 429 (resend cooldown) are expected by the suites.
        if (m.type() === 'error' && !/status of (400|429)/.test(m.text())) {
          errors.push(`console: ${m.text()}`);
        }
      });
      const s = createSuite({
        page,
        web: WEB,
        apiLog: path.join(outDir, 'api.log'),
        outDir,
        name: suite.name,
      });
      try {
        await suite.run(s, { outDir });
      } catch {
        /* the failing step was reported */
      }
      if (s.failed()) exitCode = 1;
      if (errors.length) {
        exitCode = 1;
        console.log(`  browser errors (${errors.length}):`);
        for (const e of [...new Set(errors)].slice(0, 10)) console.log(`    ${e}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
} catch (e) {
  console.error(`\n${e.message}`);
  exitCode = 1;
} finally {
  stopAll();
}
console.log(exitCode ? '\nE2E failed (screenshots in e2e/.output)' : '\nE2E passed');
process.exit(exitCode);
