// Sign-up, quick add, transactions, analytics, dark mode, mobile layout, logout.
export const name = 'core';

export async function run(s) {
  const { page, web, step, shot, readOtp, add } = s;
  const email = `e2e.core.${Date.now()}@example.com`;

  await step('landing renders', async () => {
    await page.goto(web);
    await page.getByRole('heading', { name: 'Know where every rupee goes.' }).waitFor();
    await shot('01-landing');
  });

  await step('signup requires a name', async () => {
    await page.goto(`${web}/signup`);
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: /Send OTP/ }).click();
    await page.getByText('Please enter your full name').waitFor();
  });

  await step('signup sends an OTP with resend timer', async () => {
    await page.getByLabel('Full name').fill('Priya Sharma');
    await page.getByRole('button', { name: /Send OTP/ }).click();
    await page.getByRole('heading', { name: 'Enter the code' }).waitFor();
    await page.getByText(/Resend in \d+s/).waitFor();
  });

  await step('code screen survives a reload (e.g. after switching to the email app)', async () => {
    await page.reload();
    await page.getByRole('heading', { name: 'Enter the code' }).waitFor();
    await page.getByText(email).waitFor();
    await page.getByText(/Resend in \d+s/).waitFor();
    await page.getByRole('button', { name: 'Paste code' }).waitFor();
  });

  await step('wrong OTP is rejected, right OTP signs in', async () => {
    const otp = await readOtp(email);
    await page.getByLabel('Digit 1').fill('');
    await page.keyboard.type(otp === '000000' ? '111111' : '000000');
    await page.getByText(/incorrect|invalid/i).waitFor();
    await page.getByLabel('Digit 1').click();
    await page.keyboard.type(otp);
    await page.waitForURL('**/app/welcome');
  });

  await step('onboarding sets a monthly budget', async () => {
    await page.getByRole('heading', { name: /Welcome, Priya/ }).waitFor();
    await page.getByLabel('Monthly budget').fill('500');
    await page.getByRole('button', { name: 'Set budget' }).click();
    await page.waitForURL(`${web}/app`);
    await page
      .getByRole('heading', { name: /^Good (morning|afternoon|evening), Priya$/ })
      .waitFor();
    await page.getByText('No expenses yet — add your first one!').waitFor();
  });

  await step('quick add via N (expense + income)', async () => {
    await add({
      amount: '30',
      title: 'Auto fare',
      note: 'Motihari to Khartari',
      category: 'Travel',
      method: 'Cash',
    });
    await page.getByText(/Expense of ₹30 added/).waitFor();
    await add({ amount: '56', title: 'Milk', category: 'Groceries', method: 'UPI' });
    await add({ amount: '250', title: 'Lunch', category: 'Food & Dining', method: 'Card' });
    await add({
      amount: '45000',
      title: 'Salary',
      category: 'Salary',
      method: 'Bank',
      income: true,
    });
  });

  await step('autocomplete suggests past title and fills its category', async () => {
    await page.keyboard.press('n');
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Amount in rupees').fill('40');
    await dlg.getByRole('combobox').fill('Au');
    const opt = dlg.getByRole('option', { name: /Auto fare/ });
    await opt.waitFor();
    await opt.click();
    const pressed = await dlg
      .getByRole('button', { name: 'Travel', exact: true })
      .getAttribute('aria-pressed');
    if (pressed !== 'true') throw new Error('category was not auto-filled');
    await dlg.getByRole('button', { name: /^Save/ }).click();
    await dlg.waitFor({ state: 'detached' });
  });

  await step('dashboard totals and budget warning', async () => {
    await page.waitForTimeout(900); // count-up animation
    await page.getByText('₹376').first().waitFor(); // 30 + 56 + 250 + 40
    await page.getByText(/Heads up: 75%|left · 75% used/).waitFor();
    await shot('02-dashboard');
  });

  await step('transactions grouped by day, search', async () => {
    await page.getByRole('link', { name: 'Transactions' }).first().click();
    await page.getByRole('heading', { name: 'Today' }).waitFor();
    await page.getByText('−₹376').waitFor();
    await page.getByLabel('Search transactions').fill('khartari');
    await page.waitForTimeout(800);
    const rows = await page.locator('li button[aria-label^="Edit"]').count();
    if (rows !== 1) throw new Error(`expected 1 search result, got ${rows}`);
    await page.getByLabel('Search transactions').fill('');
  });

  await step('delete with undo', async () => {
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'More actions for Lunch' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByText('Deleted “Lunch”').waitFor();
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByText('Restored').waitFor();
    await page.getByRole('button', { name: 'Edit Lunch' }).waitFor();
  });

  await step('edit a transaction', async () => {
    await page.getByRole('button', { name: 'Edit Milk' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Amount in rupees').fill('60');
    await dlg.getByRole('button', { name: 'Save changes' }).click();
    await dlg.waitFor({ state: 'detached' });
    await page.getByText('−₹60').first().waitFor();
  });

  await step('analytics charts, periods and table view', async () => {
    await page.getByRole('link', { name: 'Analytics' }).first().click();
    await page.getByText('Total spent').waitFor();
    await page.locator('.recharts-surface').first().waitFor();
    for (const p of ['Week', 'Year', 'Day', 'Month']) {
      await page.getByRole('radio', { name: p, exact: true }).click();
      await page.waitForTimeout(400);
    }
    await page.getByRole('button', { name: 'Show By category as table' }).click();
    await page.getByRole('cell', { name: 'Travel' }).waitFor();
    await shot('03-analytics');
  });

  await step('item detail page', async () => {
    await page.getByRole('link', { name: /Auto fare.*across 2 times/ }).click();
    await page.getByRole('heading', { name: 'Auto fare' }).waitFor();
    await page.getByText('₹70 across 2 times').first().waitFor();
  });

  await step('dark mode', async () => {
    await page.goto(`${web}/app`);
    await page.getByRole('button', { name: 'Account menu' }).first().click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await page.waitForTimeout(900);
    await shot('04-dashboard-dark');
    await page.getByRole('button', { name: 'Account menu' }).first().click();
    await page.getByRole('menuitemradio', { name: 'Light' }).click();
  });

  await step('phone layout: bottom nav, quick add sheet, no overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${web}/app`);
    await page.getByRole('button', { name: 'Add expense' }).last().click();
    await page.getByRole('dialog').waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw new Error('horizontal overflow on mobile');
    await shot('05-mobile-quick-add');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1360, height: 900 });
  });

  await step('logout protects routes', async () => {
    await page.goto(`${web}/app`);
    await page.getByRole('button', { name: 'Account menu' }).first().click();
    await page.getByRole('menuitem', { name: 'Log out', exact: true }).click();
    await page.waitForURL('**/login');
    await page.goto(`${web}/app/analytics`);
    await page.waitForURL(/\/login\?next=/);
  });

  await step('re-login within 60s shows the resend cooldown', async () => {
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: /Send OTP/ }).click();
    await page.getByText(/Please wait \d+s before requesting a new code/).waitFor();
  });
}
