import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { DEFAULT_CATEGORIES } from '@paipai/shared/categories';
import { createTestDb } from './testing';
import { seedSystemCategories } from './seed';
import { budgets, categories, transactions, users } from './schema';
import { localBucket, localDow, normalizedTitle, sumPaise, tzLiteral } from './sql';
import type { Database } from './client';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => {
  await close();
});

async function makeUser(id: string) {
  await db.insert(users).values({ id, name: 'Test User', email: `${id}@example.com` });
}

describe('migrations + seed', () => {
  it('seeds all system categories', async () => {
    const [row] = await db.select({ n: count() }).from(categories).where(isNull(categories.userId));
    expect(row?.n).toBe(DEFAULT_CATEGORIES.length);
  });

  it('is idempotent', async () => {
    await seedSystemCategories(db);
    await seedSystemCategories(db);
    const [row] = await db.select({ n: count() }).from(categories).where(isNull(categories.userId));
    expect(row?.n).toBe(DEFAULT_CATEGORIES.length);
  });

  it('orders expense categories as defined', async () => {
    const rows = await db
      .select({ name: categories.name })
      .from(categories)
      .where(and(isNull(categories.userId), eq(categories.type, 'expense')))
      .orderBy(asc(categories.sortOrder));
    expect(rows[0]?.name).toBe('Travel');
    expect(rows.at(-1)?.name).toBe('Other');
  });

  it('applies user defaults (INR, Asia/Kolkata)', async () => {
    await makeUser('u-defaults');
    const [u] = await db.select().from(users).where(eq(users.id, 'u-defaults'));
    expect(u?.currency).toBe('INR');
    expect(u?.timezone).toBe('Asia/Kolkata');
    expect(u?.theme).toBe('system');
  });
});

describe('constraints', () => {
  it('rejects non-positive amounts', async () => {
    await makeUser('u-chk');
    await expect(
      db.insert(transactions).values({ userId: 'u-chk', amount: 0, title: 'Zero' }),
    ).rejects.toThrow();
  });

  it('stores amounts as exact integer paise', async () => {
    const [t] = await db
      .insert(transactions)
      .values({ userId: 'u-chk', amount: 1999, title: 'Milk' })
      .returning();
    expect(t?.amount).toBe(1999);
    expect(t?.tags).toEqual([]);
  });

  it('allows only one overall budget per period', async () => {
    await db.insert(budgets).values({ userId: 'u-chk', amount: 500000 });
    await expect(db.insert(budgets).values({ userId: 'u-chk', amount: 600000 })).rejects.toThrow();
  });

  it('cascades user deletion to all user data', async () => {
    await makeUser('u-del');
    await db.insert(transactions).values({ userId: 'u-del', amount: 3000, title: 'Auto fare' });
    await db.insert(categories).values({
      userId: 'u-del',
      name: 'Pets',
      icon: 'dog',
      color: '#7CC4FA',
      type: 'expense',
    });
    await db.delete(users).where(eq(users.id, 'u-del'));
    const [t] = await db
      .select({ n: count() })
      .from(transactions)
      .where(eq(transactions.userId, 'u-del'));
    const [c] = await db
      .select({ n: count() })
      .from(categories)
      .where(eq(categories.userId, 'u-del'));
    expect(t?.n).toBe(0);
    expect(c?.n).toBe(0);
  });
});

describe('timezone-aware aggregation', () => {
  it('groups by IST calendar day, not UTC', async () => {
    await makeUser('u-tz');
    await db.insert(transactions).values([
      // 9 Jul 23:00 UTC = 10 Jul 04:30 IST
      {
        userId: 'u-tz',
        amount: 3000,
        title: 'Auto fare',
        occurredAt: new Date('2024-07-09T23:00:00Z'),
      },
      // 10 Jul 10:00 UTC = 10 Jul 15:30 IST
      {
        userId: 'u-tz',
        amount: 2500,
        title: 'auto fare ',
        occurredAt: new Date('2024-07-10T10:00:00Z'),
      },
      // 10 Jul 18:45 UTC = 11 Jul 00:15 IST
      { userId: 'u-tz', amount: 6000, title: 'Milk', occurredAt: new Date('2024-07-10T18:45:00Z') },
    ]);

    const day = localBucket(transactions.occurredAt, 'Asia/Kolkata', 'day');
    const rows = await db
      .select({ day, total: sumPaise(transactions.amount) })
      .from(transactions)
      .where(eq(transactions.userId, 'u-tz'))
      .groupBy(day)
      .orderBy(day);

    expect(rows).toEqual([
      { day: '2024-07-10', total: 5500 },
      { day: '2024-07-11', total: 6000 },
    ]);
  });

  it('groups items by normalised title', async () => {
    const key = normalizedTitle(transactions.title);
    const rows = await db
      .select({ key, n: count() })
      .from(transactions)
      .where(eq(transactions.userId, 'u-tz'))
      .groupBy(key)
      .orderBy(key);
    expect(rows).toEqual([
      { key: 'auto fare', n: 2 },
      { key: 'milk', n: 1 },
    ]);
  });
});

describe('sql helpers', () => {
  it('rejects unsafe timezone strings', () => {
    expect(() => tzLiteral("Asia/Kolkata'; drop table users; --")).toThrow(RangeError);
    expect(() => tzLiteral('Not/AZone')).toThrow(RangeError);
  });

  it('computes Monday-based day of week in IST', async () => {
    const rows = await db
      .select({ dow: localDow(transactions.occurredAt, 'Asia/Kolkata'), n: count() })
      .from(transactions)
      .where(eq(transactions.userId, 'u-tz'))
      .groupBy(sql`1`)
      .orderBy(sql`1`);
    // 10 Jul 2024 = Wednesday (2), 11 Jul 2024 = Thursday (3)
    expect(rows).toEqual([
      { dow: 2, n: 2 },
      { dow: 3, n: 1 },
    ]);
  });
});
