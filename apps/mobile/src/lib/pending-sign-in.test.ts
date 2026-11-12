import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
    removeItem: async (k: string) => void store.delete(k),
  },
}));

import {
  PENDING_SIGN_IN_TTL_MS,
  clearPendingSignIn,
  loadPendingSignIn,
  resendSecondsLeft,
  savePendingSignIn,
} from './pending-sign-in';

beforeEach(() => store.clear());

describe('pending sign-in', () => {
  it('round-trips while the code is still valid', async () => {
    const sentAt = 1_000_000;
    await savePendingSignIn({ email: 'a@b.in', mode: 'signup', name: 'Priya', sentAt });
    expect(await loadPendingSignIn(sentAt + 60_000)).toEqual({
      email: 'a@b.in',
      mode: 'signup',
      name: 'Priya',
      sentAt,
    });
  });

  it('expires with the code and cleans up', async () => {
    await savePendingSignIn({ email: 'a@b.in', mode: 'login', sentAt: 0 });
    expect(await loadPendingSignIn(PENDING_SIGN_IN_TTL_MS)).toBeNull();
    expect(store.size).toBe(0);
  });

  it('ignores corrupt data', async () => {
    store.set('paipai:pending-sign-in', '{"email":42}');
    expect(await loadPendingSignIn()).toBeNull();
    store.set('paipai:pending-sign-in', 'not json');
    expect(await loadPendingSignIn()).toBeNull();
  });

  it('can be cleared', async () => {
    await savePendingSignIn({ email: 'a@b.in', mode: 'login', sentAt: Date.now() });
    await clearPendingSignIn();
    expect(await loadPendingSignIn()).toBeNull();
  });

  it('counts the resend timer from when the code was sent', () => {
    expect(resendSecondsLeft(0, 60, 0)).toBe(60);
    expect(resendSecondsLeft(0, 60, 45_500)).toBe(15);
    expect(resendSecondsLeft(0, 60, 90_000)).toBe(0);
  });
});
