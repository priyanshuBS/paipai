import { Hono } from 'hono';
import { z } from 'zod';
import {
  analyticsPeriodSchema,
  dateStringSchema,
  rangeQuerySchema,
  timeseriesQuerySchema,
} from '@paipai/shared/schemas';
import { rangeFromDateStrings } from '@paipai/shared/date';
import { userCtx } from '../middleware';
import { zv } from '../lib/validate';
import {
  getCategoryBreakdown,
  getItemBreakdown,
  getItemDetail,
  getPatterns,
  getPaymentMethodBreakdown,
  getSummary,
  getTimeseries,
  resolveRange,
} from '../services/analytics';
import type { AppEnv } from '../types';

const listQuery = z.intersection(
  rangeQuerySchema,
  z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().max(80).optional(),
  }),
);

/** Item detail: all-time unless a period or from/to is given. */
const itemDetailQuery = z.object({
  period: analyticsPeriodSchema.optional(),
  date: dateStringSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
});

export const analyticsRoutes = new Hono<AppEnv>()
  .get('/summary', zv('query', rangeQuerySchema), async (c) => {
    const q = c.req.valid('query');
    const ctx = userCtx(c);
    const resolved = resolveRange(q, ctx.timezone);
    return c.json(await getSummary(c.get('deps').db, ctx, resolved, q.type));
  })
  .get('/timeseries', zv('query', timeseriesQuerySchema), async (c) => {
    const q = c.req.valid('query');
    const ctx = userCtx(c);
    const range = rangeFromDateStrings(q.from, q.to, ctx.timezone);
    const items = await getTimeseries(c.get('deps').db, ctx, range, q.granularity, q.type);
    return c.json({ granularity: q.granularity, items });
  })
  .get('/categories', zv('query', listQuery), async (c) => {
    const q = c.req.valid('query');
    const ctx = userCtx(c);
    const { range } = resolveRange(q, ctx.timezone);
    return c.json({
      items: await getCategoryBreakdown(c.get('deps').db, ctx, range, q.type, q.limit),
    });
  })
  .get('/items', zv('query', listQuery), async (c) => {
    const q = c.req.valid('query');
    const ctx = userCtx(c);
    const { range } = resolveRange(q, ctx.timezone);
    const items = await getItemBreakdown(c.get('deps').db, ctx, range, q.type, {
      ...(q.limit ? { limit: q.limit } : {}),
      ...(q.q ? { q: q.q } : {}),
    });
    return c.json({ items });
  })
  .get('/items/:title', zv('query', itemDetailQuery), async (c) => {
    const q = c.req.valid('query');
    const ctx = userCtx(c);
    const title = decodeURIComponent(c.req.param('title'));
    const range =
      q.period || (q.from && q.to)
        ? resolveRange({ period: q.period ?? 'custom', ...q }, ctx.timezone).range
        : null;
    return c.json(await getItemDetail(c.get('deps').db, ctx, title, range));
  })
  .get('/payment-methods', zv('query', rangeQuerySchema), async (c) => {
    const q = c.req.valid('query');
    const ctx = userCtx(c);
    const { range } = resolveRange(q, ctx.timezone);
    return c.json({ items: await getPaymentMethodBreakdown(c.get('deps').db, ctx, range, q.type) });
  })
  .get('/patterns', zv('query', rangeQuerySchema), async (c) => {
    const q = c.req.valid('query');
    const ctx = userCtx(c);
    const { range } = resolveRange(q, ctx.timezone);
    return c.json(await getPatterns(c.get('deps').db, ctx, range, q.type));
  });
