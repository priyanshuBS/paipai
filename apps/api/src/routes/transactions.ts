import { Hono } from 'hono';
import { z } from 'zod';
import {
  createTransactionSchema,
  idSchema,
  listTransactionsQuerySchema,
  titleSuggestionsQuerySchema,
  updateTransactionSchema,
} from '@paipai/shared/schemas';
import { userCtx } from '../middleware';
import { zv } from '../lib/validate';
import {
  createTransaction,
  duplicateTransaction,
  getTransaction,
  listTransactions,
  restoreTransaction,
  softDeleteTransaction,
  suggestTitles,
  updateTransaction,
} from '../services/transactions';
import type { AppEnv } from '../types';

const idParam = z.object({ id: idSchema });

export const transactionRoutes = new Hono<AppEnv>()
  .get('/', zv('query', listTransactionsQuerySchema), async (c) => {
    const page = await listTransactions(c.get('deps').db, userCtx(c), c.req.valid('query'));
    return c.json(page);
  })
  .get('/titles', zv('query', titleSuggestionsQuerySchema), async (c) => {
    const { q, limit } = c.req.valid('query');
    const items = await suggestTitles(c.get('deps').db, userCtx(c), q, limit);
    return c.json({ items });
  })
  .post('/', zv('json', createTransactionSchema), async (c) => {
    const { transaction, created } = await createTransaction(
      c.get('deps').db,
      userCtx(c),
      c.req.valid('json'),
    );
    return c.json(transaction, created ? 201 : 200);
  })
  .get('/:id', zv('param', idParam), async (c) => {
    return c.json(await getTransaction(c.get('deps').db, userCtx(c), c.req.valid('param').id));
  })
  .patch('/:id', zv('param', idParam), zv('json', updateTransactionSchema), async (c) => {
    const tx = await updateTransaction(
      c.get('deps').db,
      userCtx(c),
      c.req.valid('param').id,
      c.req.valid('json'),
    );
    return c.json(tx);
  })
  .delete('/:id', zv('param', idParam), async (c) => {
    await softDeleteTransaction(c.get('deps').db, userCtx(c), c.req.valid('param').id);
    return c.json({ deleted: true });
  })
  .post('/:id/restore', zv('param', idParam), async (c) => {
    return c.json(await restoreTransaction(c.get('deps').db, userCtx(c), c.req.valid('param').id));
  })
  .post('/:id/duplicate', zv('param', idParam), async (c) => {
    return c.json(
      await duplicateTransaction(c.get('deps').db, userCtx(c), c.req.valid('param').id),
      201,
    );
  });
