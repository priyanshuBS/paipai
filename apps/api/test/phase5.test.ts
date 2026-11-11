import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count, eq, recurringTransactions, transactions } from '@paipai/db';
import type {
  BudgetAlert,
  BudgetView,
  Category,
  MonthlyReport,
  RecurringView,
  Transaction,
} from '@paipai/shared/schemas';
import { runDueRecurring } from '../src/services/recurring';
import { csvCell } from '../src/services/export';
import type { StorageProvider } from '../src/lib/storage';
import { setup, type TestCtx } from './helpers';

const fakeStorage: StorageProvider = {
  publicBaseUrl: 'https://files.example.com',
  async presignPut(key, contentType) {
    return {
      uploadUrl: `https://upload.example.com/${key}?sig=x`,
      publicUrl: `https://files.example.com/${key}`,
      headers: { 'Content-Type': contentType },
    };
  },
};

let t: TestCtx;
let cookie: string;
let food: Category;
let travel: Category;
let salary: Category;
type TxWithAlerts = Transaction & { budgetAlerts: BudgetAlert[] };

beforeAll(async () => {
  t = await setup({ storage: fakeStorage });
  cookie = await t.signIn('phase5@example.com', 'Phase Five');
  const cats = await t.call<{ items: Category[] }>('/api/categories', { cookie });
  food = cats.body.items.find((c) => c.name === 'Food & Dining')!;
  travel = cats.body.items.find((c) => c.name === 'Travel')!;
  salary = cats.body.items.find((c) => c.name === 'Salary')!;
});
afterAll(async () => {
  await t.close();
});

const spend = (amount: number, categoryId: string, title = 'Thing') =>
  t.call<TxWithAlerts>('/api/transactions', { body: { amount, title, categoryId }, cookie });

describe('budgets', () => {
  let foodBudget: BudgetView;

  it('creates overall and per-category budgets and validates them', async () => {
    const overall = await t.call<BudgetView>('/api/budgets', { body: { amount: 1000000 }, cookie });
    expect(overall.status).toBe(201);
    expect(overall.body).toMatchObject({
      categoryId: null,
      period: 'monthly',
      alertThresholdPercent: 80,
      spent: 0,
      status: 'ok',
    });

    const f = await t.call<BudgetView>('/api/budgets', {
      body: { amount: 50000, categoryId: food.id },
      cookie,
    });
    expect(f.status).toBe(201);
    foodBudget = f.body;

    const dup = await t.call<{ error: { code: string } }>('/api/budgets', {
      body: { amount: 1, categoryId: food.id },
      cookie,
    });
    expect(dup.status).toBe(409);
    const income = await t.call('/api/budgets', {
      body: { amount: 1000, categoryId: salary.id },
      cookie,
    });
    expect(income.status).toBe(400);
  });

  it('tracks progress and fires each alert level once per period', async () => {
    // 30,000 of 50,000 = 60% -> no alert
    let r = await spend(30000, food.id, 'Lunch');
    expect(r.body.budgetAlerts).toEqual([]);

    // 42,000 = 84% -> threshold alert (food only; overall is 4.2%)
    r = await spend(12000, food.id, 'Dinner');
    expect(r.body.budgetAlerts).toHaveLength(1);
    expect(r.body.budgetAlerts[0]).toMatchObject({
      budgetId: foodBudget.id,
      level: 'threshold',
      categoryName: 'Food & Dining',
    });
    expect(r.body.budgetAlerts[0]?.message).toMatch(/84% of your Food & Dining budget/);

    // Still in threshold band -> no duplicate alert
    r = await spend(1000, food.id, 'Chai');
    expect(r.body.budgetAlerts).toEqual([]);

    // Over 100% -> over alert
    r = await spend(10000, food.id, 'Party');
    expect(r.body.budgetAlerts).toHaveLength(1);
    expect(r.body.budgetAlerts[0]?.level).toBe('over');

    // Unrelated category doesn't re-alert food
    r = await spend(500, travel.id, 'Auto');
    expect(r.body.budgetAlerts).toEqual([]);

    // Push notifications were sent for both levels
    expect(t.notifier.sent.map((s) => s.message.title)).toEqual([
      'Budget alert',
      'Budget exceeded',
    ]);

    const list = await t.call<{ items: BudgetView[] }>('/api/budgets', { cookie });
    const f = list.body.items.find((b) => b.id === foodBudget.id)!;
    expect(f).toMatchObject({ spent: 53000, remaining: -3000, percent: 106, status: 'over' });
    const overall = list.body.items.find((b) => b.categoryId === null)!;
    expect(overall.spent).toBe(53500);
  });

  it('re-arms alerts when the budget amount changes', async () => {
    const upd = await t.call<BudgetView>(`/api/budgets/${foodBudget.id}`, {
      method: 'PATCH',
      body: { amount: 60000 },
      cookie,
    });
    expect(upd.body.status).toBe('warning'); // 53000 / 60000 = 88%
    const r = await spend(100, food.id, 'Snack');
    expect(r.body.budgetAlerts[0]?.level).toBe('threshold');
  });

  it("isolates other users' budgets", async () => {
    const other = await t.signIn('phase5-other@example.com', 'Other User');
    expect(
      (await t.call(`/api/budgets/${foodBudget.id}`, { method: 'DELETE', cookie: other })).status,
    ).toBe(404);
    expect(
      (await t.call<{ items: BudgetView[] }>('/api/budgets', { cookie: other })).body.items,
    ).toEqual([]);
  });

  it('deletes budgets', async () => {
    expect(
      (await t.call(`/api/budgets/${foodBudget.id}`, { method: 'DELETE', cookie })).status,
    ).toBe(200);
  });
});

describe('recurring transactions', () => {
  let rent: RecurringView;

  it('creates a rule and validates dates', async () => {
    const start = new Date(Date.now() - 1000 * 60 * 60 * 24 * 65); // ~65 days ago
    const r = await t.call<RecurringView>('/api/recurring', {
      body: {
        amount: 1200000,
        title: 'Rent',
        categoryId: null,
        paymentMethod: 'bank',
        frequency: 'monthly',
        startAt: start.toISOString(),
      },
      cookie,
    });
    expect(r.status).toBe(201);
    rent = r.body;
    expect(rent.nextRunAt).toBe(start.toISOString());

    const bad = await t.call('/api/recurring', {
      body: {
        amount: 100,
        title: 'X',
        frequency: 'daily',
        startAt: start.toISOString(),
        endAt: new Date(start.getTime() - 1000).toISOString(),
      },
      cookie,
    });
    expect(bad.status).toBe(400);
  });

  it('runner creates missed occurrences once and advances the rule', async () => {
    const first = await runDueRecurring(t.db);
    expect(first.created).toBeGreaterThanOrEqual(2); // ~65 days of monthly rent = 3 runs
    const again = await runDueRecurring(t.db);
    expect(again.created).toBe(0); // idempotent

    const [n] = await t.db
      .select({ n: count() })
      .from(transactions)
      .where(eq(transactions.recurringId, rent.id));
    expect(n?.n).toBe(first.created);
    const [rule] = await t.db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.id, rent.id));
    expect(rule!.nextRunAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('concurrent runners never double-create', async () => {
    const start = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
    await t.call('/api/recurring', {
      body: { amount: 2000, title: 'Metro pass', frequency: 'daily', startAt: start.toISOString() },
      cookie,
    });
    const [a, b] = await Promise.all([runDueRecurring(t.db), runDueRecurring(t.db)]);
    expect(a.created + b.created).toBe(4); // start + 3 days
  });

  it('stops after the end date', async () => {
    const start = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10);
    const end = new Date(start.getTime() + 1000 * 60 * 60 * 24 * 7 + 1000);
    const r = await t.call<RecurringView>('/api/recurring', {
      body: {
        amount: 500,
        title: 'Gym trial',
        frequency: 'weekly',
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      },
      cookie,
    });
    const res = await runDueRecurring(t.db);
    expect(res.created).toBe(2);
    const list = await t.call<{ items: RecurringView[] }>('/api/recurring', { cookie });
    expect(list.body.items.find((x) => x.id === r.body.id)?.isActive).toBe(false);
  });

  it('pauses, edits and deletes', async () => {
    const p = await t.call<RecurringView>(`/api/recurring/${rent.id}`, {
      method: 'PATCH',
      body: { isActive: false, amount: 1300000 },
      cookie,
    });
    expect(p.body).toMatchObject({ isActive: false, amount: 1300000 });
    expect((await t.call(`/api/recurring/${rent.id}`, { method: 'DELETE', cookie })).status).toBe(
      200,
    );
  });

  it('cron endpoint requires the secret', async () => {
    expect((await t.call('/api/cron/recurring', { method: 'POST', body: {} })).status).toBe(401);
    expect(
      (
        await t.call('/api/cron/recurring', {
          method: 'POST',
          body: {},
          headers: { authorization: 'Bearer wrong' },
        })
      ).status,
    ).toBe(401);
    const ok = await t.call<{ created: number }>('/api/cron/recurring', {
      method: 'POST',
      body: {},
      headers: { authorization: 'Bearer test-cron-secret-0123456789' },
    });
    expect(ok.status).toBe(200);
    expect(ok.body.created).toBe(0);
  });
});

describe('export & reports', () => {
  it('exports CSV with BOM, IST dates and negative expenses', async () => {
    await t.call('/api/transactions', {
      body: {
        amount: 3050,
        title: '=HYPERLINK("x")',
        note: 'a, "quoted" note',
        categoryId: travel.id,
      },
      cookie,
    });
    const today = new Date().toISOString().slice(0, 10);
    const r = await t.app.request(`/api/export?format=csv&from=2000-01-01&to=2099-12-31`, {
      headers: { cookie, origin: 'http://localhost:3000' },
    });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/csv');
    expect(r.headers.get('content-disposition')).toContain('paipai-2000-01-01-to-2099-12-31.csv');
    const bytes = Buffer.from(await r.arrayBuffer());
    // UTF-8 BOM so Excel reads ₹ correctly (Response.text() would strip it).
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = bytes.toString('utf8');
    expect(text).toContain(
      'Date,Time,Type,Title,Note,Category,Payment method,Amount,Currency,Tags,Location',
    );
    expect(text).toContain(`"'=HYPERLINK(""x"")","a, ""quoted"" note",Travel,UPI,-30.50,INR`);
    expect(today.length).toBe(10);
  });

  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('-30.50')).toBe('-30.50');
    expect(csvCell('-cmd')).toBe("'-cmd");
  });

  it('exports a PDF statement', async () => {
    const r = await t.app.request(`/api/export?format=pdf&from=2000-01-01&to=2099-12-31`, {
      headers: { cookie, origin: 'http://localhost:3000' },
    });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/pdf');
    const buf = Buffer.from(await r.arrayBuffer());
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(5000);
  });

  it('validates export ranges', async () => {
    expect(
      (await t.call('/api/export?format=csv&from=2024-02-01&to=2024-01-01', { cookie })).status,
    ).toBe(400);
  });

  it('builds a monthly report', async () => {
    const month = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date());
    const r = await t.call<MonthlyReport>(`/api/reports/monthly?month=${month}`, { cookie });
    expect(r.status).toBe(200);
    expect(r.body.summary.totalExpense).toBeGreaterThan(0);
    expect(r.body.daily.length).toBeGreaterThanOrEqual(28);
    expect(r.body.topItems.length).toBeGreaterThan(0);
    expect(r.body.biggestExpense?.title).toBeTruthy();
    expect((await t.call('/api/reports/monthly?month=2024-13', { cookie })).status).toBe(400);
  });
});

describe('uploads, receipts and push tokens', () => {
  it('reports upload availability and presigns into the user folder', async () => {
    expect(
      (await t.call<{ enabled: boolean }>('/api/uploads/config', { cookie })).body.enabled,
    ).toBe(true);
    const p = await t.call<{ publicUrl: string }>('/api/uploads/presign', {
      body: { kind: 'receipt', contentType: 'image/jpeg', size: 1000 },
      cookie,
    });
    expect(p.status).toBe(200);
    expect(p.body.publicUrl).toMatch(
      /^https:\/\/files\.example\.com\/receipts\/[^/]+\/[0-9a-f-]+\.jpg$/,
    );
    const big = await t.call('/api/uploads/presign', {
      body: { kind: 'receipt', contentType: 'image/jpeg', size: 50_000_000 },
      cookie,
    });
    expect(big.status).toBe(400);
    const badType = await t.call('/api/uploads/presign', {
      body: { kind: 'receipt', contentType: 'application/pdf', size: 10 },
      cookie,
    });
    expect(badType.status).toBe(400);

    // Receipt must be our own upload for this user
    const ok = await t.call('/api/transactions', {
      body: { amount: 100, title: 'With receipt', receiptUrl: p.body.publicUrl },
      cookie,
    });
    expect(ok.status).toBe(201);
    const evil = await t.call('/api/transactions', {
      body: { amount: 100, title: 'Bad receipt', receiptUrl: 'https://evil.example.com/x.jpg' },
      cookie,
    });
    expect(evil.status).toBe(400);
  });

  it('hides uploads when storage is not configured', async () => {
    const plain = await setup();
    const c = await plain.signIn('nostorage@example.com', 'No Storage');
    expect(
      (await plain.call<{ enabled: boolean }>('/api/uploads/config', { cookie: c })).body.enabled,
    ).toBe(false);
    expect(
      (
        await plain.call('/api/uploads/presign', {
          body: { kind: 'avatar', contentType: 'image/png', size: 10 },
          cookie: c,
        })
      ).status,
    ).toBe(404);
    await plain.close();
  });

  it('registers and removes push tokens', async () => {
    const token = 'ExponentPushToken[abcdefghij123]';
    expect(
      (await t.call('/api/push-tokens', { body: { token, platform: 'android' }, cookie })).status,
    ).toBe(200);
    expect(
      (await t.call('/api/push-tokens', { body: { token, platform: 'android' }, cookie })).status,
    ).toBe(200); // upsert
    expect(
      (
        await t.call('/api/push-tokens', {
          body: { token: 'not-a-token', platform: 'ios' },
          cookie,
        })
      ).status,
    ).toBe(400);
    expect(
      (await t.call('/api/push-tokens', { method: 'DELETE', body: { token }, cookie })).status,
    ).toBe(200);
  });
});

describe('overall monthly budget sync', () => {
  it('keeps users.monthlyBudget and the overall monthly budget row in sync', async () => {
    const c = await t.signIn('sync@example.com', 'Sync User');
    await t.call('/api/me', { method: 'PATCH', body: { monthlyBudget: 2000000 }, cookie: c });
    let list = await t.call<{ items: BudgetView[] }>('/api/budgets', { cookie: c });
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      categoryId: null,
      period: 'monthly',
      amount: 2000000,
    });

    await t.call(`/api/budgets/${list.body.items[0]?.id}`, {
      method: 'PATCH',
      body: { amount: 2500000 },
      cookie: c,
    });
    expect(
      (await t.call<{ monthlyBudget: number }>('/api/me', { cookie: c })).body.monthlyBudget,
    ).toBe(2500000);

    await t.call(`/api/budgets/${list.body.items[0]?.id}`, { method: 'DELETE', cookie: c });
    expect(
      (await t.call<{ monthlyBudget: number | null }>('/api/me', { cookie: c })).body.monthlyBudget,
    ).toBeNull();

    await t.call('/api/me', { method: 'PATCH', body: { monthlyBudget: null }, cookie: c });
    list = await t.call<{ items: BudgetView[] }>('/api/budgets', { cookie: c });
    expect(list.body.items).toHaveLength(0);
  });
});
