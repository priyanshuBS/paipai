// Visual tour: seeds a realistic month, then screenshots every page in light
// and dark mode, desktop and phone width. Not part of the default run:
//   pnpm e2e screens
export const name = 'screens';
export const optIn = true;

const pages = [
  ['dashboard', '/app'],
  ['transactions', '/app/transactions'],
  ['analytics', '/app/analytics'],
  ['budgets', '/app/budgets'],
  ['recurring', '/app/recurring'],
  ['reports', '/app/reports'],
  ['settings', '/app/settings'],
  ['categories', '/app/settings/categories'],
];

const seed = [
  ['250', 'Lunch', 'Food & Dining', 'Card'],
  ['30', 'Auto fare', 'Travel', 'Cash'],
  ['56', 'Milk', 'Groceries', 'UPI'],
  ['1299', 'Shoes', 'Shopping', 'Card'],
  ['40', 'Auto fare', 'Travel', 'Cash'],
  ['799', 'Electricity bill', 'Bills & Utilities', 'UPI'],
  ['120', 'Chai and snacks', 'Food & Dining', 'UPI'],
  ['450', 'Movie', 'Entertainment', 'Card'],
];

export async function run(s) {
  const { page, web, step, shot, add, signUp } = s;

  await step('sign up and seed a month of data', async () => {
    await signUp('Priya Sharma', `e2e.screens.${Date.now()}@example.com`);
    await page.getByLabel('Monthly budget').fill('5000');
    await page.getByRole('button', { name: 'Set budget' }).click();
    await page.waitForURL(`${web}/app`);
    for (const [amount, title, category, method] of seed) {
      await add({ amount, title, category, method });
    }
    await add({
      amount: '45000',
      title: 'Salary',
      category: 'Salary',
      method: 'Bank',
      income: true,
    });
    await page.getByRole('link', { name: 'Budgets' }).first().click();
    await page.getByRole('button', { name: /New budget/ }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Applies to').selectOption({ label: 'Food & Dining' });
    await dlg.getByLabel('Amount (₹)').fill('400');
    await dlg.getByRole('button', { name: 'Create budget' }).click();
    await dlg.waitFor({ state: 'detached' });
  });

  const tour = async (prefix) => {
    for (const [label, path] of pages) {
      await page.goto(`${web}${path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500); // chart + count-up animations
      await shot(`${prefix}-${label}`);
    }
  };

  await step('desktop, light', async () => {
    await page.emulateMedia({ colorScheme: 'light' });
    await tour('light');
    await page.keyboard.press('n');
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(400);
    await shot('light-quick-add');
    await page.keyboard.press('Escape');
  });

  await step('desktop, dark', async () => {
    await page.goto(`${web}/app/settings`);
    await page.getByRole('radio', { name: 'Dark' }).click();
    await page.waitForTimeout(500);
    await tour('dark');
    await page.goto(`${web}/app/settings`);
    await page.getByRole('radio', { name: 'Light' }).click();
  });

  await step('phone width', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [label, path] of pages.slice(0, 3)) {
      await page.goto(`${web}${path}`);
      await page.waitForTimeout(1500);
      await shot(`phone-${label}`);
    }
  });

  await step('public pages', async () => {
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.context().clearCookies();
    for (const [label, path] of [
      ['landing', '/'],
      ['login', '/login'],
    ]) {
      await page.goto(`${web}${path}`);
      await page.waitForTimeout(600);
      await shot(`public-${label}`);
    }
  });
}
