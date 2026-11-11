import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  AnalyticsSummary,
  Category,
  CategoryBreakdownRow,
  ItemBreakdownRow,
  PatternRow,
  PaymentMethodRow,
  TimeseriesPoint,
} from '@paipai/shared/schemas';
import { setup, type TestCtx } from './helpers';

let t: TestCtx;
let cookie: string;
let travel: Category;
let food: Category;

/** IST wall-clock -> ISO UTC */
const ist = (s: string) => new Date(`${s}+05:30`).toISOString();

beforeAll(async () => {
  t = await setup();
  cookie = await t.signIn('analytics@example.com', 'Ana Lytics');
  const cats = await t.call<{ items: Category[] }>('/api/categories', { cookie });
  travel = cats.body.items.find((c) => c.name === 'Travel')!;
  food = cats.body.items.find((c) => c.name === 'Food & Dining')!;

  const rows = [
    // Week of Mon 1 Jul 2024
    {
      amount: 20000,
      title: 'Auto fare',
      categoryId: travel.id,
      paymentMethod: 'cash',
      occurredAt: ist('2024-07-01T09:00:00'),
    },
    {
      amount: 30000,
      title: 'Lunch',
      categoryId: food.id,
      paymentMethod: 'upi',
      occurredAt: ist('2024-07-03T13:00:00'),
    },
    // Week of Mon 8 Jul 2024
    {
      amount: 25000,
      title: 'Auto fare',
      categoryId: travel.id,
      paymentMethod: 'cash',
      occurredAt: ist('2024-07-08T09:15:00'),
    },
    {
      amount: 20000,
      title: 'auto  FARE',
      categoryId: travel.id,
      paymentMethod: 'upi',
      occurredAt: ist('2024-07-10T23:59:00'),
    },
    {
      amount: 25000,
      title: 'Dinner',
      categoryId: food.id,
      paymentMethod: 'card',
      occurredAt: ist('2024-07-11T00:10:00'),
    },
    { amount: 5000, title: 'Misc', paymentMethod: 'upi', occurredAt: ist('2024-07-14T20:00:00') },
    // Previous month
    {
      amount: 40000,
      title: 'Auto fare',
      categoryId: travel.id,
      paymentMethod: 'cash',
      occurredAt: ist('2024-06-20T09:00:00'),
    },
  ];
  for (const r of rows) {
    const res = await t.call('/api/transactions', { body: r, cookie });
    if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  }
  await t.call('/api/transactions', {
    body: {
      type: 'income',
      amount: 5000000,
      title: 'Salary',
      occurredAt: ist('2024-07-01T10:00:00'),
    },
    cookie,
  });
  // Deleted rows must not count
  const del = await t.call<{ id: string }>('/api/transactions', {
    body: { amount: 999900, title: 'Deleted', occurredAt: ist('2024-07-05T10:00:00') },
    cookie,
  });
  await t.call(`/api/transactions/${del.body.id}`, { method: 'DELETE', cookie });
});
afterAll(async () => {
  await t.close();
});

describe('summary', () => {
  it('totals the month in IST with % change vs previous month', async () => {
    const r = await t.call<AnalyticsSummary>(
      '/api/analytics/summary?period=month&date=2024-07-15',
      { cookie },
    );
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      totalExpense: 125000,
      totalIncome: 5000000,
      net: 5000000 - 125000,
      count: 6,
      previousTotal: 40000,
      changePercent: 212.5,
      range: { from: '2024-06-30T18:30:00.000Z', to: '2024-07-31T18:30:00.000Z' },
    });
  });

  it('week period compares against the previous week', async () => {
    const r = await t.call<AnalyticsSummary>('/api/analytics/summary?period=week&date=2024-07-10', {
      cookie,
    });
    expect(r.body.totalExpense).toBe(75000);
    expect(r.body.previousTotal).toBe(50000);
    expect(r.body.changePercent).toBe(50);
  });

  it('supports custom ranges and validates them', async () => {
    const r = await t.call<AnalyticsSummary>(
      '/api/analytics/summary?period=custom&from=2024-07-10&to=2024-07-11',
      { cookie },
    );
    expect(r.body.totalExpense).toBe(45000);
    const bad = await t.call('/api/analytics/summary?period=custom', { cookie });
    expect(bad.status).toBe(400);
  });
});

describe('timeseries', () => {
  it('fills empty days with zero and buckets by IST day', async () => {
    const r = await t.call<{ items: TimeseriesPoint[] }>(
      '/api/analytics/timeseries?granularity=day&from=2024-07-08&to=2024-07-14',
      { cookie },
    );
    expect(r.body.items.map((p) => [p.bucket, p.total])).toEqual([
      ['2024-07-08', 25000],
      ['2024-07-09', 0],
      ['2024-07-10', 20000],
      ['2024-07-11', 25000],
      ['2024-07-12', 0],
      ['2024-07-13', 0],
      ['2024-07-14', 5000],
    ]);
  });

  it('buckets by Monday-start weeks and by month', async () => {
    const w = await t.call<{ items: TimeseriesPoint[] }>(
      '/api/analytics/timeseries?granularity=week&from=2024-07-01&to=2024-07-14',
      { cookie },
    );
    expect(w.body.items).toEqual([
      { bucket: '2024-07-01', total: 50000, count: 2 },
      { bucket: '2024-07-08', total: 75000, count: 4 },
    ]);
    const m = await t.call<{ items: TimeseriesPoint[] }>(
      '/api/analytics/timeseries?granularity=month&from=2024-01-01&to=2024-12-31',
      { cookie },
    );
    expect(m.body.items).toHaveLength(12);
    expect(m.body.items[5]).toEqual({ bucket: '2024-06-01', total: 40000, count: 1 });
    expect(m.body.items[6]).toEqual({ bucket: '2024-07-01', total: 125000, count: 6 });
  });

  it('rejects oversized ranges', async () => {
    const r = await t.call(
      '/api/analytics/timeseries?granularity=day&from=2020-01-01&to=2024-12-31',
      { cookie },
    );
    expect(r.status).toBe(400);
  });
});

describe('breakdowns', () => {
  it('category breakdown with percentages', async () => {
    const r = await t.call<{ items: CategoryBreakdownRow[] }>(
      '/api/analytics/categories?period=month&date=2024-07-15',
      { cookie },
    );
    expect(r.body.items.map((c) => [c.name, c.total, c.count, c.percent])).toEqual([
      ['Travel', 65000, 3, 52],
      ['Food & Dining', 55000, 2, 44],
      ['Uncategorised', 5000, 1, 4],
    ]);
  });

  it('item-wise totals group by normalised title', async () => {
    const r = await t.call<{ items: ItemBreakdownRow[] }>(
      '/api/analytics/items?period=month&date=2024-07-15',
      { cookie },
    );
    expect(r.body.items[0]).toMatchObject({
      key: 'auto fare',
      total: 65000,
      count: 3,
      average: 21667,
      categoryId: travel.id,
    });
    const top = await t.call<{ items: ItemBreakdownRow[] }>(
      '/api/analytics/items?period=month&date=2024-07-15&limit=2',
      { cookie },
    );
    expect(top.body.items).toHaveLength(2);
  });

  it('item detail shows all-time history', async () => {
    const r = await t.call<{
      total: number;
      count: number;
      title: string;
      series: TimeseriesPoint[];
      transactions: unknown[];
    }>(`/api/analytics/items/${encodeURIComponent('Auto Fare')}`, { cookie });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ total: 105000, count: 4, title: 'auto  FARE' });
    expect(r.body.transactions).toHaveLength(4);
    expect(r.body.series.reduce((s, p) => s + p.total, 0)).toBe(105000);
    expect((await t.call('/api/analytics/items/never-bought', { cookie })).status).toBe(404);
  });

  it('payment method breakdown', async () => {
    const r = await t.call<{ items: PaymentMethodRow[] }>(
      '/api/analytics/payment-methods?period=month&date=2024-07-15',
      { cookie },
    );
    expect(r.body.items.map((p) => [p.paymentMethod, p.total, p.percent])).toEqual([
      ['upi', 55000, 44],
      ['cash', 45000, 36],
      ['card', 25000, 20],
    ]);
  });

  it('day-of-week and hour-of-day patterns in IST', async () => {
    const r = await t.call<{ dayOfWeek: PatternRow[]; hourOfDay: PatternRow[] }>(
      '/api/analytics/patterns?period=week&date=2024-07-10',
      { cookie },
    );
    expect(r.body.dayOfWeek).toHaveLength(7);
    expect(r.body.hourOfDay).toHaveLength(24);
    // Mon 25000, Wed 20000 (23:59 IST), Thu 25000 (00:10 IST), Sun 5000
    expect(r.body.dayOfWeek.map((d) => d.total)).toEqual([25000, 0, 20000, 25000, 0, 0, 5000]);
    expect(r.body.hourOfDay[23]?.total).toBe(20000);
    expect(r.body.hourOfDay[0]?.total).toBe(25000);
    expect(r.body.hourOfDay[9]?.total).toBe(25000);
  });
});
