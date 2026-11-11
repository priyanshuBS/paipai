import { createApiClient } from '@paipai/shared/api-client';
import { API_URL } from './config';

export {
  ApiError,
  type ItemDetail,
  type RangeParams,
  type TransactionFilters,
  type TransactionPage,
} from '@paipai/shared/api-client';

/** Web client: session lives in an httpOnly cookie, so send credentials. */
export const api = createApiClient({ baseUrl: API_URL, credentials: 'include' });
