import Constants from 'expo-constants';

/**
 * API base URL.
 * - EXPO_PUBLIC_API_URL wins when set (required for EAS builds).
 * - In development we reuse the Expo dev server's LAN host, so a phone on the
 *   same Wi-Fi reaches the API running on your computer at port 8787.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/$/, '');
  if (!__DEV__) {
    // A store/preview build must be given the public https API (EAS env var).
    console.warn(
      'EXPO_PUBLIC_API_URL is not set for this release build; the app cannot reach the API.',
    );
  }
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.10:8081"
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:8787` : 'http://localhost:8787';
}

export const API_URL = resolveApiUrl();
export const APP_SCHEME = 'paipai';
