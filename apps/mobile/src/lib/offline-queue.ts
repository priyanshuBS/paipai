/**
 * Offline queue for new transactions. Each entry carries a client-generated
 * UUID, so replaying it after reconnecting is idempotent on the server
 * (POST /api/transactions with an existing id returns the same row).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { CreateTransactionInput } from '@paipai/shared/schemas';
import { api, ApiError } from './api';

const KEY = 'paipai:offline-queue';

export interface PendingTransaction {
  id: string;
  payload: CreateTransactionInput & { id: string };
  queuedAt: string;
}

let cache: PendingTransaction[] | null = null;
const listeners = new Set<(items: PendingTransaction[]) => void>();

async function load(): Promise<PendingTransaction[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as PendingTransaction[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function save(items: PendingTransaction[]) {
  cache = items;
  listeners.forEach((l) => l(items));
  await AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => undefined);
}

export async function enqueueTransaction(payload: CreateTransactionInput & { id: string }) {
  const items = await load();
  await save([
    ...items.filter((i) => i.id !== payload.id),
    { id: payload.id, payload, queuedAt: new Date().toISOString() },
  ]);
}

/** Network failures (no response at all) are worth queueing; HTTP errors are not. */
export function isOfflineError(err: unknown): boolean {
  return err instanceof ApiError ? err.status === 0 : err instanceof TypeError;
}

let flushing: Promise<{ synced: number; dropped: number }> | null = null;

/** Send queued transactions in order. Stops at the first network failure. */
export function flushQueue(): Promise<{ synced: number; dropped: number }> {
  flushing ??= (async () => {
    let synced = 0;
    let dropped = 0;
    try {
      for (const item of [...(await load())]) {
        try {
          await api.createTransaction(item.payload);
          synced++;
        } catch (err) {
          if (isOfflineError(err)) break;
          // 401 means signed out: keep it for the next session. Other 4xx are invalid: drop.
          if (err instanceof ApiError && err.status === 401) break;
          dropped++;
        }
        await save((await load()).filter((i) => i.id !== item.id));
      }
    } finally {
      flushing = null;
    }
    return { synced, dropped };
  })();
  return flushing;
}

export async function clearQueue() {
  await save([]);
}

export function usePendingTransactions(): PendingTransaction[] {
  const [items, setItems] = useState<PendingTransaction[]>(cache ?? []);
  useEffect(() => {
    listeners.add(setItems);
    void load().then(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);
  return items;
}
