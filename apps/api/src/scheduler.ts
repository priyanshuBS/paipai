import type { Database } from '@paipai/db';
import { logger } from './lib/logger';
import type { Notifier } from './lib/notifier';
import { runDueRecurring } from './services/recurring';

/**
 * In-process scheduler for long-running hosts (Render, Fly, a VPS). Serverless
 * hosts should call POST /api/cron/recurring instead. Running both is safe:
 * the runner locks rows with SKIP LOCKED.
 */
export function startRecurringScheduler(
  db: Database,
  notifier: Notifier,
  everyMs = 10 * 60 * 1000,
) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runDueRecurring(db, new Date(), {
        onCreated: (userId, count) =>
          void notifier.sendToUser(userId, {
            title: 'Recurring entries added',
            body:
              count === 1
                ? '1 recurring transaction was added.'
                : `${count} recurring transactions were added.`,
            data: { type: 'recurring' },
          }),
      });
    } catch (err) {
      logger.error('recurring.run_failed', { message: (err as Error).message });
    } finally {
      running = false;
    }
  };
  const first = setTimeout(() => void tick(), 15_000);
  const timer = setInterval(() => void tick(), everyMs);
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
