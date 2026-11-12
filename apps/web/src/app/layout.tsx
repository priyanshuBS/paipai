import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { ThemeVars } from '@/components/theme-vars';
import { SITE_URL } from '@/lib/config';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'PaiPai — Paai-paai ka hisaab',
    template: '%s · PaiPai',
  },
  description:
    'Track every rupee in seconds. PaiPai is a simple, beautiful expense tracker for India — budgets, analytics and item-wise spending in ₹.',
  applicationName: 'PaiPai',
  keywords: [
    'expense tracker',
    'budget app India',
    'money manager',
    'INR',
    'spending tracker',
    'PaiPai',
  ],
  openGraph: {
    type: 'website',
    siteName: 'PaiPai',
    title: 'PaiPai — Paai-paai ka hisaab',
    description:
      'Track your spending effortlessly. Budgets, analytics and item-wise insights in ₹.',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#09090B' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable} suppressHydrationWarning>
      <head>
        <ThemeVars />
      </head>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
