/** Budgets, recurring, push tokens, export, reports and uploads. */
import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, pushTokens } from '@paipai/db';
import {
  createBudgetSchema,
  createRecurringSchema,
  exportQuerySchema,
  idSchema,
  monthlyReportQuerySchema,
  presignUploadSchema,
  pushTokenSchema,
  updateBudgetSchema,
  updateRecurringSchema,
} from '@paipai/shared/schemas';
import { AppError } from '../lib/errors';
import { uploadKey } from '../lib/storage';
import { zv } from '../lib/validate';
import { userCtx } from '../middleware';
import { createBudget, deleteBudget, listBudgets, updateBudget } from '../services/budgets';
import { buildCsv, buildPdf, loadExportRows } from '../services/export';
import {
  createRecurring,
  deleteRecurring,
  listRecurring,
  updateRecurring,
} from '../services/recurring';
import { monthlyReport } from '../services/reports';
import type { AppEnv } from '../types';

const idParam = z.object({ id: idSchema });

export const budgetRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ items: await listBudgets(c.get('deps').db, userCtx(c)) }))
  .post('/', zv('json', createBudgetSchema), async (c) =>
    c.json(await createBudget(c.get('deps').db, userCtx(c), c.req.valid('json')), 201),
  )
  .patch('/:id', zv('param', idParam), zv('json', updateBudgetSchema), async (c) =>
    c.json(
      await updateBudget(
        c.get('deps').db,
        userCtx(c),
        c.req.valid('param').id,
        c.req.valid('json'),
      ),
    ),
  )
  .delete('/:id', zv('param', idParam), async (c) => {
    await deleteBudget(c.get('deps').db, userCtx(c), c.req.valid('param').id);
    return c.json({ deleted: true });
  });

export const recurringRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ items: await listRecurring(c.get('deps').db, userCtx(c)) }))
  .post('/', zv('json', createRecurringSchema), async (c) =>
    c.json(await createRecurring(c.get('deps').db, userCtx(c), c.req.valid('json')), 201),
  )
  .patch('/:id', zv('param', idParam), zv('json', updateRecurringSchema), async (c) =>
    c.json(
      await updateRecurring(
        c.get('deps').db,
        userCtx(c),
        c.req.valid('param').id,
        c.req.valid('json'),
      ),
    ),
  )
  .delete('/:id', zv('param', idParam), async (c) => {
    await deleteRecurring(c.get('deps').db, userCtx(c), c.req.valid('param').id);
    return c.json({ deleted: true });
  });

export const pushTokenRoutes = new Hono<AppEnv>()
  .post('/', zv('json', pushTokenSchema), async (c) => {
    const { token, platform } = c.req.valid('json');
    const userId = c.get('user').id;
    // A device token belongs to whoever signed in on it last.
    await c
      .get('deps')
      .db.insert(pushTokens)
      .values({ userId, token, platform })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { userId, platform, updatedAt: new Date() },
      });
    return c.json({ ok: true });
  })
  .delete('/', zv('json', pushTokenSchema.pick({ token: true })), async (c) => {
    await c
      .get('deps')
      .db.delete(pushTokens)
      .where(
        and(
          eq(pushTokens.token, c.req.valid('json').token),
          eq(pushTokens.userId, c.get('user').id),
        ),
      );
    return c.json({ ok: true });
  });

export const exportRoutes = new Hono<AppEnv>().get(
  '/',
  zv('query', exportQuerySchema),
  async (c) => {
    const { format, from, to } = c.req.valid('query');
    const user = c.get('user');
    const ctx = {
      ...userCtx(c),
      currency: typeof user.currency === 'string' ? user.currency : 'INR',
    };
    const rows = await loadExportRows(c.get('deps').db, ctx, from, to);
    const base = `paipai-${from}-to-${to}`;
    c.header('Cache-Control', 'no-store');
    if (format === 'pdf') {
      const pdf = await buildPdf(rows, { ...ctx, name: user.name }, from, to);
      c.header('Content-Type', 'application/pdf');
      c.header('Content-Disposition', `attachment; filename="${base}.pdf"`);
      return c.body(new Uint8Array(pdf));
    }
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${base}.csv"`);
    return c.body(buildCsv(rows, ctx));
  },
);

export const reportRoutes = new Hono<AppEnv>().get(
  '/monthly',
  zv('query', monthlyReportQuerySchema),
  async (c) =>
    c.json(await monthlyReport(c.get('deps').db, userCtx(c), c.req.valid('query').month)),
);

export const uploadRoutes = new Hono<AppEnv>()
  .get('/config', (c) => c.json({ enabled: c.get('deps').storage !== null }))
  .post('/presign', zv('json', presignUploadSchema), async (c) => {
    const storage = c.get('deps').storage;
    if (!storage)
      throw new AppError(404, 'UPLOADS_DISABLED', 'File uploads are not enabled on this server');
    const input = c.req.valid('json');
    return c.json(await storage.presignPut(uploadKey(c.get('user').id, input), input.contentType));
  });
