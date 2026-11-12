import type { NextConfig } from 'next';

/**
 * Production addresses. Applied only to Vercel production builds, so local,
 * CI and E2E builds keep talking to localhost. Explicit NEXT_PUBLIC_* env vars
 * (e.g. set in Vercel) always win.
 */
const PRODUCTION_URLS = {
  NEXT_PUBLIC_SITE_URL: 'https://paipai.priyanshusingh.co.in',
  NEXT_PUBLIC_API_URL: 'https://api.paipai.priyanshusingh.co.in',
};
const isVercelProduction = process.env.VERCEL_ENV === 'production';

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@paipai/shared'],
  poweredByHeader: false,
  env: isVercelProduction
    ? {
        NEXT_PUBLIC_SITE_URL:
          process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_URLS.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? PRODUCTION_URLS.NEXT_PUBLIC_API_URL,
      }
    : {},
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default config;
