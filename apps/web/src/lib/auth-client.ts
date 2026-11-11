'use client';

import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import { API_URL } from './config';

export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/api/auth',
  fetchOptions: { credentials: 'include' },
  plugins: [emailOTPClient()],
});

export const { useSession } = authClient;
