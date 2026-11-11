import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFlow } from '@/components/auth/auth-flow';

export const metadata: Metadata = { title: 'Log in', robots: { index: false } };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthFlow mode="login" />
    </Suspense>
  );
}
