import { Hono, type Context } from 'hono';
import { z } from 'zod';
import {
  createTransactionSchema,
  idSchema,
  listTransactionsQuerySchema,
  titleSuggestionsQuerySchema,
  updateTransactionSchema,
} from '@paipai/shared/schemas';
import { badRequest } from '../lib/errors';
import { isOwnUpload } from '../lib/storage';
import { userCtx } from '../middleware';
import { checkBudgetAlerts } from '../services/budgets';
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

/** Receipts must be files we issued an upload URL for, in the user's own folder. */
function assertReceipt(c: Context<AppEnv>, url: string | null | undefined) {
  if (!url) return;
  if (!isOwnUpload(c.get('deps').storage, c.get('user').id, url)) {
    throw badRequest('Receipt must be uploaded through PaiPai', [
      { path: 'receiptUrl', message: 'Invalid receipt URL' },
    ]);
  }
}

function alertsFor(c: Context<AppEnv>) {
  const user = c.get('user');
  const currency = typeof user.currency === 'string' ? user.currency : 'INR';
  return checkBudgetAlerts(c.get('deps').db, { ...userCtx(c), currency }, c.get('deps').notifier);
}

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
    const body = c.req.valid('json');
    assertReceipt(c, body.receiptUrl);
    const { transaction, created } = await createTransaction(c.get('deps').db, userCtx(c), body);
    const budgetAlerts = created && transaction.type === 'expense' ? await alertsFor(c) : [];
    return c.json({ ...transaction, budgetAlerts }, created ? 201 : 200);
  })
  .get('/:id', zv('param', idParam), async (c) => {
    return c.json(await getTransaction(c.get('deps').db, userCtx(c), c.req.valid('param').id));
  })
  .patch('/:id', zv('param', idParam), zv('json', updateTransactionSchema), async (c) => {
    const body = c.req.valid('json');
    assertReceipt(c, body.receiptUrl);
    const tx = await updateTransaction(c.get('deps').db, userCtx(c), c.req.valid('param').id, body);
    const budgetAlerts = tx.type === 'expense' ? await alertsFor(c) : [];
    return c.json({ ...tx, budgetAlerts });
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
