// Budgets + alerts, recurring, custom categories, reports and export, settings.
import fs from 'node:fs';
import path from 'node:path';

export const name = 'money';

export async function run(s, { outDir }) {
  const { page, web, step, shot, add, signUp } = s;
  const email = `e2e.money.${Date.now()}@example.com`;

  await step('sign up and skip the budget step', async () => {
    await signUp('Phase Five', email);
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.waitForURL(`${web}/app`);
  });

  await step('create overall and category budgets', async () => {
    await page.getByRole('link', { name: 'Budgets' }).first().click();
    await page.getByText('No budgets yet').waitFor();
    await page.getByRole('button', { name: /New budget/ }).click();
    let dlg = page.getByRole('dialog');
    await dlg.getByLabel('Amount (₹)').fill('1000');
    await dlg.getByRole('button', { name: 'Create budget' }).click();
    await dlg.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: /New budget/ }).click();
    dlg = page.getByRole('dialog');
    await dlg.getByLabel('Applies to').selectOption({ label: 'Food & Dining' });
    await dlg.getByLabel('Amount (₹)').fill('100');
    await dlg.getByRole('button', { name: 'Create budget' }).click();
    await dlg.waitFor({ state: 'detached' });
    await page.getByText('Food & Dining').first().waitFor();
  });

  await step('threshold and over-budget alerts appear as toasts', async () => {
    await add({ amount: '85', title: 'Lunch', category: 'Food & Dining' });
    await page.getByText(/You've used 85% of your Food & Dining budget/).waitFor();
    await add({ amount: '30', title: 'Snacks', category: 'Food & Dining' });
    await page.getByText(/You've gone over your Food & Dining budget/).waitFor();
    await page.getByRole('link', { name: 'Budgets' }).first().click();
    await page
      .getByText(/Over by ₹15/)
      .first()
      .waitFor();
    await shot('01-budgets');
  });

  await step('dashboard shows alerts and the synced monthly budget', async () => {
    await page.getByRole('link', { name: 'Home' }).first().click();
    await page.getByRole('heading', { name: 'Budget alerts' }).waitFor();
    await page.getByText('Monthly budget').waitFor();
  });

  await step('recurring: create, pause, resume', async () => {
    await page.getByRole('link', { name: 'Recurring' }).first().click();
    await page.getByRole('button', { name: /^New$/ }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Name').fill('Rent');
    await dlg.getByLabel('Amount (₹)').fill('12000');
    await dlg.getByLabel('Repeats').selectOption('monthly');
    await dlg.getByRole('button', { name: 'Add recurring' }).click();
    await dlg.waitFor({ state: 'detached' });
    await page.getByText(/Every month · next/).waitFor();
    await page.getByRole('button', { name: 'Pause Rent' }).click();
    await page.getByText(/Every month · paused/).waitFor();
    await page.getByRole('button', { name: 'Resume Rent' }).click();
    await page.getByText(/Every month · next/).waitFor();
  });

  await step('custom category is created and usable', async () => {
    await page.goto(`${web}/app/settings/categories`);
    await page.getByRole('button', { name: /^New$/ }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Name').fill('Pets');
    await dlg.getByRole('button', { name: 'dog' }).click();
    await dlg.getByRole('button', { name: 'Create category' }).click();
    await dlg.waitFor({ state: 'detached' });
    await page.getByText('Pets').waitFor();
    await add({ amount: '250', title: 'Vet visit', category: 'Pets' });
  });

  await step('monthly report and CSV / PDF export', async () => {
    await page.getByRole('link', { name: 'Reports' }).first().click();
    await page.getByText('Where it went').waitFor();
    await page.getByText('Pets').first().waitFor();
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'CSV' }).click(),
    ]);
    const csvPath = path.join(outDir, 'export.csv');
    await csv.saveAs(csvPath);
    const text = fs.readFileSync(csvPath, 'utf8');
    if (!text.includes('Vet visit') || !text.includes(',Pets,'))
      throw new Error('CSV is missing rows');
    const [pdf] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /PDF statement/ }).click(),
    ]);
    const pdfPath = path.join(outDir, 'export.pdf');
    await pdf.saveAs(pdfPath);
    if (fs.readFileSync(pdfPath).subarray(0, 5).toString() !== '%PDF-')
      throw new Error('not a PDF');
    await shot('02-reports');
  });

  await step('currency switch re-formats amounts; theme persists to the account', async () => {
    await page.getByRole('link', { name: 'Settings' }).first().click();
    await page.getByLabel('Currency').selectOption('USD');
    await page.getByText('Currency updated').waitFor();
    await page.getByRole('link', { name: 'Home' }).first().click();
    await page
      .getByText(/\$1,?150|\$365/)
      .first()
      .waitFor();
    await page.getByRole('link', { name: 'Settings' }).first().click();
    await page.getByLabel('Currency').selectOption('INR');
    await page.getByRole('radio', { name: 'Dark' }).click();
    await page.waitForTimeout(800);
    await page.reload();
    await page.waitForTimeout(1200);
    const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (!dark) throw new Error('theme did not persist');
  });

  await step('phone layout: extra pages reachable from the account menu', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${web}/app`);
    await page.getByRole('button', { name: 'Account menu' }).last().click();
    await page.getByRole('menuitem', { name: 'Budgets' }).click();
    await page.waitForURL('**/app/budgets');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw new Error('horizontal overflow');
  });
}
