export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787').replace(
  /\/$/,
  '',
);
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

/** Latest Android build (APK) on Expo: the page has a download button and QR code. */
export const ANDROID_APP_URL =
  'https://expo.dev/accounts/priyanshu69/projects/paipai/builds/0c1f1342-34f2-4b49-b7bf-a93be27f4576';

export const AUTHOR_URL = 'https://priyanshusingh.co.in';
