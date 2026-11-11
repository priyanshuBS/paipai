import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { API_URL, APP_SCHEME } from './config';

/**
 * Better Auth client for Expo. The session cookie is kept in the device's
 * secure keychain/keystore (expo-secure-store) and sent as a Cookie header.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/api/auth',
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storagePrefix: 'paipai',
      cookiePrefix: 'paipai',
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});

export const { useSession } = authClient;
