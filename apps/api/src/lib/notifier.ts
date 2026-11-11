import { eq, inArray, pushTokens, type Database } from '@paipai/db';
import { logger } from './logger';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface Notifier {
  /** Send to every registered device of a user. Never throws. */
  sendToUser(userId: string, message: PushMessage): Promise<void>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/** Expo Push Service (works for both iOS and Android builds). */
export function createExpoNotifier(db: Database): Notifier {
  return {
    async sendToUser(userId, message) {
      try {
        const rows = await db
          .select({ token: pushTokens.token })
          .from(pushTokens)
          .where(eq(pushTokens.userId, userId));
        if (rows.length === 0) return;
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(
            rows
              .slice(0, 100)
              .map((r) => ({
                to: r.token,
                sound: 'default',
                title: message.title,
                body: message.body,
                data: message.data ?? {},
              })),
          ),
        });
        const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
        // Drop tokens for uninstalled apps.
        const dead = (json?.data ?? [])
          .map((t, i) =>
            t.status === 'error' && t.details?.error === 'DeviceNotRegistered'
              ? rows[i]?.token
              : null,
          )
          .filter((t): t is string => Boolean(t));
        if (dead.length) await db.delete(pushTokens).where(inArray(pushTokens.token, dead));
      } catch (err) {
        logger.warn('push.send_failed', { userId, message: (err as Error).message });
      }
    },
  };
}

/** Test helper: records messages instead of sending. */
export function createMemoryNotifier(): Notifier & {
  sent: { userId: string; message: PushMessage }[];
} {
  const sent: { userId: string; message: PushMessage }[] = [];
  return {
    sent,
    async sendToUser(userId, message) {
      sent.push({ userId, message });
    },
  };
}
