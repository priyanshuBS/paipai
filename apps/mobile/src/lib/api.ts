import { createApiClient } from '@paipai/shared/api-client';
import { authClient } from './auth-client';
import { API_URL } from './config';

export {
  ApiError,
  type ItemDetail,
  type RangeParams,
  type TransactionFilters,
  type TransactionPage,
} from '@paipai/shared/api-client';

/** Mobile client: attach the session cookie stored by the Better Auth Expo plugin. */
export const api = createApiClient({
  baseUrl: API_URL,
  headers: async (): Promise<Record<string, string>> => {
    const cookie = await authClient.getCookie();
    return cookie ? { Cookie: cookie } : {};
  },
});
