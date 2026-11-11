import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';
import { authClient } from './auth-client';

/** A 401 means the session is gone: clear it so the auth guard shows login. */
function onAuthError(err: unknown) {
  if (err instanceof ApiError && err.status === 401) void authClient.signOut();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onAuthError }),
  mutationCache: new MutationCache({ onError: onAuthError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24, // keep cached data for 24h (offline-friendly)
      retry: (count, err) =>
        !(err instanceof ApiError && err.status > 0 && err.status < 500) && count < 2,
    },
  },
});

/** Sign out locally: end the session and wipe cached data from this device. */
export async function signOutAndClear(opts: { allDevices?: boolean } = {}) {
  if (opts.allDevices) await authClient.revokeSessions();
  await authClient.signOut();
  queryClient.clear();
}
