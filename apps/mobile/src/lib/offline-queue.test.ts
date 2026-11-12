import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@paipai/shared/api-client';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
  },
}));

const createTransaction = vi.fn();
vi.mock('./api', async () => ({
  api: { createTransaction: (...args: unknown[]) => createTransaction(...args) },
  ApiError: (await import('@paipai/shared/api-client')).ApiError,
}));

import * as q from './offline-queue';

const payload = (id: string, amount = 1000) => ({
  id,
  amount,
  type: 'expense' as const,
  title: `Item ${id}`,
  paymentMethod: 'upi' as const,
  occurredAt: '2026-11-12T10:00:00.000Z',
  categoryId: null,
});

const stored = () =>
  (JSON.parse(store.get('paipai:offline-queue') ?? '[]') as { id: string }[]).map((i) => i.id);

beforeEach(async () => {
  store.clear();
  createTransaction.mockReset();
  await q.clearQueue();
});

describe('offline queue', () => {
  it('persists entries and de-duplicates by client id', async () => {
    await q.enqueueTransaction(payload('a'));
    await q.enqueueTransaction(payload('b'));
    await q.enqueueTransaction(payload('a', 2000)); // edited while offline
    expect(stored()).toEqual(['b', 'a']);
  });

  it('replays in order and empties the queue', async () => {
    createTransaction.mockResolvedValue({});
    await q.enqueueTransaction(payload('a'));
    await q.enqueueTransaction(payload('b'));
    expect(await q.flushQueue()).toEqual({ synced: 2, dropped: 0 });
    expect(createTransaction.mock.calls.map((c) => (c[0] as { id: string }).id)).toEqual([
      'a',
      'b',
    ]);
    expect(stored()).toEqual([]);
  });

  it('stops at the first network failure and keeps the rest', async () => {
    createTransaction
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    for (const id of ['a', 'b', 'c']) await q.enqueueTransaction(payload(id));
    expect(await q.flushQueue()).toEqual({ synced: 1, dropped: 0 });
    expect(stored()).toEqual(['b', 'c']);
    expect(createTransaction).toHaveBeenCalledTimes(2);
  });

  it('keeps entries when signed out (401) and drops invalid ones (4xx)', async () => {
    createTransaction.mockRejectedValueOnce(new ApiError(400, 'VALIDATION', 'bad'));
    createTransaction.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'signed out'));
    for (const id of ['bad', 'later']) await q.enqueueTransaction(payload(id));
    expect(await q.flushQueue()).toEqual({ synced: 0, dropped: 1 });
    expect(stored()).toEqual(['later']);
  });

  it('runs one flush at a time', async () => {
    let release!: () => void;
    createTransaction.mockImplementation(() => new Promise<void>((r) => (release = r)));
    await q.enqueueTransaction(payload('a'));
    const first = q.flushQueue();
    const second = q.flushQueue();
    expect(second).toBe(first);
    await vi.waitFor(() => expect(createTransaction).toHaveBeenCalledTimes(1));
    release();
    expect(await first).toEqual({ synced: 1, dropped: 0 });
  });

  it('classifies offline errors', () => {
    expect(q.isOfflineError(new TypeError('Network request failed'))).toBe(true);
    expect(q.isOfflineError(new ApiError(0, 'NETWORK', 'offline'))).toBe(true);
    expect(q.isOfflineError(new ApiError(500, 'INTERNAL', 'boom'))).toBe(false);
  });
});
