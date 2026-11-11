import {
  and,
  asc,
  categories,
  count,
  eq,
  inArray,
  isNull,
  or,
  sql,
  transactions,
  type CategoryRow,
  type Database,
} from '@paipai/db';
import type {
  Category,
  CreateCategoryInput,
  TransactionType,
  UpdateCategoryInput,
} from '@paipai/shared/schemas';
import { AppError, badRequest, forbidden, notFound } from '../lib/errors';

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
    isArchived: row.isArchived,
    sortOrder: row.sortOrder,
    isSystem: row.userId === null,
  };
}

/** Categories visible to a user: system defaults + their own. */
const visibleTo = (userId: string) => or(isNull(categories.userId), eq(categories.userId, userId));

export async function listCategories(
  db: Database,
  userId: string,
  opts: { type?: TransactionType; includeArchived?: boolean } = {},
): Promise<Category[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(
      and(
        visibleTo(userId),
        opts.type ? eq(categories.type, opts.type) : undefined,
        opts.includeArchived ? undefined : eq(categories.isArchived, false),
      ),
    )
    // Custom categories after system ones, each group in its own sort order.
    .orderBy(
      asc(categories.type),
      sql`${categories.userId} IS NOT NULL`,
      asc(categories.sortOrder),
      asc(categories.name),
    );
  return rows.map(toCategory);
}

/** Ensure a category is usable by this user for the given transaction type. */
export async function assertUsableCategory(
  db: Database,
  userId: string,
  categoryId: string,
  type: TransactionType,
): Promise<void> {
  const [row] = await db
    .select({ type: categories.type })
    .from(categories)
    .where(and(eq(categories.id, categoryId), visibleTo(userId)))
    .limit(1);
  if (!row)
    throw badRequest('Category not found', [{ path: 'categoryId', message: 'Category not found' }]);
  if (row.type !== type) {
    throw badRequest(`That category is for ${row.type}, not ${type}`, [
      { path: 'categoryId', message: 'Category type does not match' },
    ]);
  }
}

async function getOwned(db: Database, userId: string, id: string): Promise<CategoryRow> {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), visibleTo(userId)))
    .limit(1);
  if (!row) throw notFound('Category');
  if (row.userId === null) throw forbidden('Default categories cannot be changed');
  return row;
}

export async function createCategory(
  db: Database,
  userId: string,
  input: CreateCategoryInput,
): Promise<Category> {
  const [{ max } = { max: -1 }] = await db
    .select({ max: sql<number>`coalesce(max(${categories.sortOrder}), -1)`.mapWith(Number) })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.type, input.type)));
  const [row] = await db
    .insert(categories)
    .values({ ...input, userId, sortOrder: max + 1 })
    .returning();
  if (!row) throw new AppError(500, 'INTERNAL_ERROR', 'Could not create category');
  return toCategory(row);
}

export async function updateCategory(
  db: Database,
  userId: string,
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  await getOwned(db, userId, id);
  const [row] = await db
    .update(categories)
    .set(input)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();
  if (!row) throw notFound('Category');
  return toCategory(row);
}

/** Deletes an unused custom category; archives it instead if transactions reference it. */
export async function deleteCategory(
  db: Database,
  userId: string,
  id: string,
): Promise<{ deleted: boolean; archived: boolean }> {
  await getOwned(db, userId, id);
  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.categoryId, id)));
  if (n > 0) {
    await db
      .update(categories)
      .set({ isArchived: true })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    return { deleted: false, archived: true };
  }
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
  return { deleted: true, archived: false };
}

/** Set sort order of the user's custom categories to the order of `ids`. */
export async function reorderCategories(
  db: Database,
  userId: string,
  ids: string[],
): Promise<void> {
  const owned = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), inArray(categories.id, ids)));
  if (owned.length !== new Set(ids).size)
    throw badRequest('Only your own categories can be reordered');
  const cases = sql.join(
    ids.map((id, i) => sql`WHEN ${id}::uuid THEN ${i}::int`),
    sql` `,
  );
  await db
    .update(categories)
    .set({ sortOrder: sql`CASE ${categories.id} ${cases} END` })
    .where(and(eq(categories.userId, userId), inArray(categories.id, ids)));
}
