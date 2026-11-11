import { Hono } from 'hono';
import { eq, users } from '@paipai/db';
import { updateMeSchema, type Me } from '@paipai/shared/schemas';
import { notFound } from '../lib/errors';
import { zv } from '../lib/validate';
import type { AppEnv } from '../types';

function toMe(u: typeof users.$inferSelect): Me {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    image: u.image,
    currency: u.currency,
    timezone: u.timezone,
    monthlyBudget: u.monthlyBudget,
    theme: u.theme,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export const meRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    const { db } = c.get('deps');
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, c.get('user').id))
      .limit(1);
    if (!u) throw notFound('User');
    return c.json(toMe(u));
  })
  .patch('/', zv('json', updateMeSchema), async (c) => {
    const { db } = c.get('deps');
    const [u] = await db
      .update(users)
      .set(c.req.valid('json'))
      .where(eq(users.id, c.get('user').id))
      .returning();
    if (!u) throw notFound('User');
    return c.json(toMe(u));
  })
  /** Permanently deletes the account and all data (FK cascades remove sessions, transactions, …). */
  .delete('/', async (c) => {
    const { db } = c.get('deps');
    await db.delete(users).where(eq(users.id, c.get('user').id));
    return c.json({ deleted: true });
  });
