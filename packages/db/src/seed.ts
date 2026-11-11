import { sql } from 'drizzle-orm';
import { DEFAULT_CATEGORIES } from '@paipai/shared/categories';
import type { Database } from './client';
import { categories } from './schema';

/**
 * Upsert the system default categories (user_id NULL). Idempotent: rerunning
 * updates names/icons/colours by their stable `key`.
 */
export async function seedSystemCategories(db: Database): Promise<number> {
  const rows = DEFAULT_CATEGORIES.map((c) => ({
    key: c.key,
    userId: null,
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
    sortOrder: c.sortOrder,
  }));

  const result = await db
    .insert(categories)
    .values(rows)
    .onConflictDoUpdate({
      target: categories.key,
      set: {
        name: sql`excluded.name`,
        icon: sql`excluded.icon`,
        color: sql`excluded.color`,
        type: sql`excluded.type`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: categories.id });

  return result.length;
}
