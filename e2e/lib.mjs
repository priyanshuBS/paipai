import fs from 'node:fs';
import path from 'node:path';

/** Per-suite helpers: numbered steps with a screenshot on failure, OTP lookup, quick add. */
export function createSuite({ page, web, apiLog, outDir, name }) {
  const shot = (file) =>
    page.screenshot({ path: path.join(outDir, `${name}-${file}.png`), fullPage: true });

  let failed = 0;
  const step = async (title, fn) => {
    try {
      await fn();
      console.log(`  ✓ ${title}`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${title}: ${String(e.message).split('\n')[0]}`);
      await shot(`FAIL-${title.replace(/\W+/g, '-')}`).catch(() => undefined);
      throw e;
    }
  };

  /** The sandbox API prints OTPs as JSON log lines (`email.dev_otp`). */
  const readOtp = async (email) => {
    for (let i = 0; i < 40; i++) {
      const otp = fs
        .readFileSync(apiLog, 'utf8')
        .split('\n')
        .filter((l) => l.includes('dev_otp') && l.includes(email))
        .map((l) => JSON.parse(l).otp)
        .at(-1);
      if (otp) return otp;
      await page.waitForTimeout(250);
    }
    throw new Error(`OTP for ${email} not found in the API log`);
  };

  /** Quick Add via the N shortcut. */
  const add = async ({ amount, title, note, category, method, income }) => {
    await page.keyboard.press('Escape');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('n');
    const dlg = page.getByRole('dialog');
    await dlg.waitFor();
    if (income) await dlg.getByRole('radio', { name: 'Income' }).click();
    await dlg.getByLabel('Amount in rupees').fill(amount);
    await dlg.getByRole('combobox').fill(title);
    if (note) await dlg.getByLabel(/Note/).fill(note);
    if (category) await dlg.getByRole('button', { name: category, exact: true }).click();
    if (method) await dlg.getByRole('button', { name: method, exact: true }).click();
    await dlg.getByRole('button', { name: /^Save/ }).click();
    await dlg.waitFor({ state: 'detached' });
  };

  /** Sign up a fresh user and land on the dashboard (skipping the budget step). */
  const signUp = async (fullName, email) => {
    await page.goto(`${web}/signup`);
    await page.getByLabel('Full name').fill(fullName);
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: /Send OTP/ }).click();
    await page.getByRole('heading', { name: 'Enter the code' }).waitFor();
    const otp = await readOtp(email);
    await page.getByLabel('Digit 1').click();
    await page.keyboard.type(otp);
    await page.waitForURL('**/app/welcome');
  };

  return { page, web, shot, step, readOtp, add, signUp, failed: () => failed };
}
