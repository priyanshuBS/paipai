import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Category, TitleSuggestion, Transaction } from '@paipai/shared/schemas';
import { setup, type TestCtx } from './helpers';

let t: TestCtx;
let alice: string;
let bob: string;
let travel: Category;
let salary: Category;

type Page = {
  items: Transaction[];
  nextCursor: string | null;
  dayTotals: Record<string, { expense: number; income: number }>;
};

beforeAll(async () => {
  t = await setup();
  alice = await t.signIn('alice@example.com', 'Alice Verma');
  bob = await t.signIn('bob@example.com', 'Bob Khan');
  const cats = await t.call<{ items: Category[] }>('/api/categories', { cookie: alice });
  travel = cats.body.items.find((c) => c.name === 'Travel')!;
  salary = cats.body.items.find((c) => c.name === 'Salary')!;
});
afterAll(async () => {
  await t.close();
});

const create = (cookie: string, body: Record<string, unknown>) =>
  t.call<Transaction & { error?: { code: string; details: { path: string }[] } }>(
    '/api/transactions',
    { body, cookie },
  );

describe('transactions CRUD', () => {
  let id: string;

  it('creates an expense with defaults', async () => {
    const r = await create(alice, {
      amount: 3000,
      title: 'Auto fare',
      note: 'Motihari to Khartari',
      categoryId: travel.id,
      paymentMethod: 'cash',
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      type: 'expense',
      amount: 3000,
      title: 'Auto fare',
      note: 'Motihari to Khartari',
      categoryId: travel.id,
      paymentMethod: 'cash',
      tags: [],
    });
    expect(new Date(r.body.occurredAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
    id = r.body.id;
  });

  it('validates input with structured errors', async () => {
    const r = await create(alice, { amount: 12.5, title: '' });
    expect(r.status).toBe(400);
    expect(r.body.error?.code).toBe('VALIDATION_ERROR');
    expect(r.body.error?.details.map((d) => d.path)).toEqual(
      expect.arrayContaining(['amount', 'title']),
    );
  });

  it('rejects a category of the wrong type', async () => {
    const r = await create(alice, { amount: 100, title: 'Oops', categoryId: salary.id });
    expect(r.status).toBe(400);
  });

  it('reads, updates and duplicates', async () => {
    expect(
      (await t.call<Transaction>(`/api/transactions/${id}`, { cookie: alice })).body.title,
    ).toBe('Auto fare');
    const upd = await t.call<Transaction>(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: { amount: 3500, tags: ['work'] },
      cookie: alice,
    });
    expect(upd.status).toBe(200);
    expect(upd.body).toMatchObject({ amount: 3500, tags: ['work'], title: 'Auto fare' });

    const dup = await t.call<Transaction>(`/api/transactions/${id}/duplicate`, {
      method: 'POST',
      cookie: alice,
    });
    expect(dup.status).toBe(201);
    expect(dup.body.id).not.toBe(id);
    expect(dup.body).toMatchObject({ amount: 3500, title: 'Auto fare' });
  });

  it('soft deletes with undo', async () => {
    const del = await t.call(`/api/transactions/${id}`, { method: 'DELETE', cookie: alice });
    expect(del.status).toBe(200);
    expect((await t.call(`/api/transactions/${id}`, { cookie: alice })).status).toBe(404);
    const undo = await t.call<Transaction>(`/api/transactions/${id}/restore`, {
      method: 'POST',
      cookie: alice,
    });
    expect(undo.status).toBe(200);
    expect((await t.call(`/api/transactions/${id}`, { cookie: alice })).status).toBe(200);
  });

  it("isolates users from each other's data", async () => {
    expect((await t.call(`/api/transactions/${id}`, { cookie: bob })).status).toBe(404);
    expect(
      (
        await t.call(`/api/transactions/${id}`, {
          method: 'PATCH',
          body: { amount: 1 },
          cookie: bob,
        })
      ).status,
    ).toBe(404);
    expect(
      (await t.call(`/api/transactions/${id}`, { method: 'DELETE', cookie: bob })).status,
    ).toBe(404);
    const list = await t.call<Page>('/api/transactions', { cookie: bob });
    expect(list.body.items).toHaveLength(0);
  });

  it('is idempotent for client-generated ids (offline queue)', async () => {
    const clientId = crypto.randomUUID();
    const a = await create(alice, { id: clientId, amount: 4500, title: 'Milk' });
    const b = await create(alice, { id: clientId, amount: 4500, title: 'Milk' });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.id).toBe(clientId);
    // Another user cannot claim (or read) that id.
    expect((await create(bob, { id: clientId, amount: 1, title: 'X' })).status).toBe(409);
  });
});

describe('listing, filters and pagination', () => {
  let carol: string;

  beforeAll(async () => {
    carol = await t.signIn('carol@example.com', 'Carol Das');
    // 25 transactions over 5 IST days (5 per day), alternating payment methods.
    const base = Date.parse('2024-07-10T04:30:00Z'); // 10:00 IST
    for (let day = 0; day < 5; day++) {
      for (let i = 0; i < 5; i++) {
        await create(carol, {
          amount: 1000 * (i + 1),
          title: i % 2 === 0 ? 'Auto fare' : 'Chai',
          note: i === 0 ? 'Motihari to Khartari' : null,
          paymentMethod: i % 2 === 0 ? 'upi' : 'cash',
          tags: i === 4 ? ['trip'] : [],
          occurredAt: new Date(base + day * 86_400_000 + i * 60_000).toISOString(),
        });
      }
    }
    await create(carol, {
      type: 'income',
      amount: 5000000,
      title: 'Salary',
      occurredAt: '2024-07-12T05:00:00Z',
    });
  });

  it('paginates with a stable cursor and no duplicates', async () => {
    const seen = new Set<string>();
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r: { body: Page } = await t.call<Page>(
        `/api/transactions?limit=7${cursor ? `&cursor=${cursor}` : ''}`,
        { cookie: carol },
      );
      for (const item of r.body.items) {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
      }
      cursor = r.body.nextCursor;
      pages++;
    } while (cursor && pages < 10);
    expect(seen.size).toBe(26);
    expect(pages).toBe(4);
  });

  it('sorts newest first by default and by amount on request', async () => {
    const byDate = await t.call<Page>('/api/transactions?limit=3', { cookie: carol });
    const times = byDate.body.items.map((i) => Date.parse(i.occurredAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    const byAmount = await t.call<Page>('/api/transactions?sort=amount_desc&limit=2', {
      cookie: carol,
    });
    expect(byAmount.body.items[0]?.amount).toBe(5000000);
  });

  it('returns full-day totals for days on the page', async () => {
    const r = await t.call<Page>('/api/transactions?limit=2&type=expense', { cookie: carol });
    // Latest day is 14 Jul IST: 1000+2000+3000+4000+5000
    expect(r.body.dayTotals['2024-07-14']).toEqual({ expense: 15000, income: 0 });
  });

  it('searches title and note', async () => {
    const r = await t.call<Page>('/api/transactions?q=khartari', { cookie: carol });
    expect(r.body.items).toHaveLength(5);
    const r2 = await t.call<Page>('/api/transactions?q=CHAI', { cookie: carol });
    expect(r2.body.items).toHaveLength(10);
  });

  it('treats LIKE wildcards literally', async () => {
    const r = await t.call<Page>('/api/transactions?q=%25', { cookie: carol });
    expect(r.body.items).toHaveLength(0);
  });

  it('filters by date range (IST days), type, method, amount and tags', async () => {
    const day = await t.call<Page>('/api/transactions?from=2024-07-11&to=2024-07-11', {
      cookie: carol,
    });
    expect(day.body.items).toHaveLength(5);

    const income = await t.call<Page>('/api/transactions?type=income', { cookie: carol });
    expect(income.body.items).toHaveLength(1);

    const cash = await t.call<Page>('/api/transactions?paymentMethod=cash&limit=100', {
      cookie: carol,
    });
    expect(cash.body.items.every((i) => i.paymentMethod === 'cash')).toBe(true);
    expect(cash.body.items).toHaveLength(10);

    const amt = await t.call<Page>('/api/transactions?minAmount=4000&maxAmount=5000&limit=100', {
      cookie: carol,
    });
    expect(amt.body.items).toHaveLength(10);

    const tags = await t.call<Page>('/api/transactions?tags=trip', { cookie: carol });
    expect(tags.body.items).toHaveLength(5);
  });

  it('rejects invalid filters', async () => {
    expect(
      (await t.call('/api/transactions?from=2024-07-12&to=2024-07-01', { cookie: carol })).status,
    ).toBe(400);
    expect((await t.call('/api/transactions?cursor=garbage', { cookie: carol })).status).toBe(400);
    expect(
      (await t.call('/api/transactions?paymentMethod=bitcoin', { cookie: carol })).status,
    ).toBe(400);
  });

  it('suggests past titles with their last-used category', async () => {
    await create(carol, {
      amount: 2000,
      title: 'Auto fare',
      categoryId: travel.id,
      occurredAt: '2024-07-20T05:00:00Z',
    });
    const r = await t.call<{ items: TitleSuggestion[] }>('/api/transactions/titles?q=au', {
      cookie: carol,
    });
    expect(r.body.items[0]).toMatchObject({
      title: 'Auto fare',
      categoryId: travel.id,
      lastAmount: 2000,
      count: 16,
    });

    const none = await t.call<{ items: TitleSuggestion[] }>('/api/transactions/titles?q=zzz', {
      cookie: carol,
    });
    expect(none.body.items).toHaveLength(0);
  });
});

describe('categories', () => {
  it('lists system defaults', async () => {
    const r = await t.call<{ items: Category[] }>('/api/categories?type=expense', {
      cookie: alice,
    });
    expect(r.body.items).toHaveLength(14);
    expect(r.body.items[0]).toMatchObject({ name: 'Travel', isSystem: true });
  });

  it('creates, edits, reorders, archives and deletes custom categories', async () => {
    const a = await t.call<Category>('/api/categories', {
      body: { name: 'Pets', icon: 'dog', color: '#7CC4FA', type: 'expense' },
      cookie: alice,
    });
    const b = await t.call<Category>('/api/categories', {
      body: { name: 'Gym', icon: 'dumbbell', color: '#9BE3A8', type: 'expense' },
      cookie: alice,
    });
    expect(a.status).toBe(201);
    expect(b.body.sortOrder).toBe(a.body.sortOrder + 1);

    const edit = await t.call<Category>(`/api/categories/${a.body.id}`, {
      method: 'PATCH',
      body: { name: 'Pet care' },
      cookie: alice,
    });
    expect(edit.body.name).toBe('Pet care');

    await t.call('/api/categories/reorder', {
      body: { ids: [b.body.id, a.body.id] },
      cookie: alice,
    });
    const list = await t.call<{ items: Category[] }>('/api/categories?type=expense', {
      cookie: alice,
    });
    const custom = list.body.items.filter((c) => !c.isSystem).map((c) => c.name);
    expect(custom).toEqual(['Gym', 'Pet care']);

    // Used category -> archived instead of deleted
    await create(alice, { amount: 50000, title: 'Vet', categoryId: a.body.id });
    const del = await t.call<{ archived: boolean }>(`/api/categories/${a.body.id}`, {
      method: 'DELETE',
      cookie: alice,
    });
    expect(del.body.archived).toBe(true);
    // Unused -> deleted
    const del2 = await t.call<{ deleted: boolean }>(`/api/categories/${b.body.id}`, {
      method: 'DELETE',
      cookie: alice,
    });
    expect(del2.body.deleted).toBe(true);

    const visible = await t.call<{ items: Category[] }>('/api/categories?type=expense', {
      cookie: alice,
    });
    expect(visible.body.items.some((c) => c.id === a.body.id)).toBe(false);
  });

  it("protects system categories and other users' categories", async () => {
    expect(
      (
        await t.call(`/api/categories/${travel.id}`, {
          method: 'PATCH',
          body: { name: 'X' },
          cookie: alice,
        })
      ).status,
    ).toBe(403);
    const mine = await t.call<Category>('/api/categories', {
      body: { name: 'Secret', icon: 'gift', color: '#FFC4A3', type: 'expense' },
      cookie: alice,
    });
    expect(
      (await t.call(`/api/categories/${mine.body.id}`, { method: 'DELETE', cookie: bob })).status,
    ).toBe(404);
    expect(
      (await create(bob, { amount: 100, title: 'Sneaky', categoryId: mine.body.id })).status,
    ).toBe(400);
  });
});
