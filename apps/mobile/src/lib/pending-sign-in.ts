/**
 * Remembers an in-progress email sign-in (code sent, not yet entered).
 *
 * People leave the app to copy the code from their email. If the OS closes the
 * app meanwhile, reopening it should land back on the code screen, not on an
 * empty email form. Codes expire after 10 minutes, so this does too.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'paipai:pending-sign-in';
export const PENDING_SIGN_IN_TTL_MS = 10 * 60 * 1000;

export interface PendingSignIn {
  email: string;
  mode: 'login' | 'signup';
  name?: string;
  /** When the latest code was sent (ms since epoch); drives the resend timer. */
  sentAt: number;
}

export async function savePendingSignIn(p: PendingSignIn): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => undefined);
}

export async function loadPendingSignIn(now = Date.now()): Promise<PendingSignIn | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PendingSignIn>;
    const valid =
      typeof p.email === 'string' &&
      (p.mode === 'login' || p.mode === 'signup') &&
      typeof p.sentAt === 'number' &&
      now - p.sentAt < PENDING_SIGN_IN_TTL_MS;
    if (!valid) {
      await clearPendingSignIn();
      return null;
    }
    return p as PendingSignIn;
  } catch {
    return null;
  }
}

export async function clearPendingSignIn(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}

/** Seconds left on the resend cooldown for a code sent at `sentAt`. */
export function resendSecondsLeft(sentAt: number, cooldownSeconds: number, now = Date.now()) {
  return Math.max(0, Math.ceil(cooldownSeconds - (now - sentAt) / 1000));
}
