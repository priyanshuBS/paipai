import { Hono } from 'hono';
import { z } from 'zod';
import {
  createCategorySchema,
  idSchema,
  reorderCategoriesSchema,
  transactionTypeSchema,
  updateCategorySchema,
} from '@paipai/shared/schemas';
import { zv } from '../lib/validate';
import {
  createCategory,
  deleteCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from '../services/categories';
import type { AppEnv } from '../types';

const listQuery = z.object({
  type: transactionTypeSchema.optional(),
  includeArchived: z.enum(['true', 'false']).optional(),
});
const idParam = z.object({ id: idSchema });

export const categoryRoutes = new Hono<AppEnv>()
  .get('/', zv('query', listQuery), async (c) => {
    const q = c.req.valid('query');
    const items = await listCategories(c.get('deps').db, c.get('user').id, {
      ...(q.type ? { type: q.type } : {}),
      includeArchived: q.includeArchived === 'true',
    });
    return c.json({ items });
  })
  .post('/', zv('json', createCategorySchema), async (c) => {
    const category = await createCategory(c.get('deps').db, c.get('user').id, c.req.valid('json'));
    return c.json(category, 201);
  })
  .post('/reorder', zv('json', reorderCategoriesSchema), async (c) => {
    await reorderCategories(c.get('deps').db, c.get('user').id, c.req.valid('json').ids);
    return c.json({ ok: true });
  })
  .patch('/:id', zv('param', idParam), zv('json', updateCategorySchema), async (c) => {
    const category = await updateCategory(
      c.get('deps').db,
      c.get('user').id,
      c.req.valid('param').id,
      c.req.valid('json'),
    );
    return c.json(category);
  })
  .delete('/:id', zv('param', idParam), async (c) => {
    const result = await deleteCategory(
      c.get('deps').db,
      c.get('user').id,
      c.req.valid('param').id,
    );
    return c.json(result);
  });
