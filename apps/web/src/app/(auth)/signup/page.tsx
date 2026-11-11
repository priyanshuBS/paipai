import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFlow } from '@/components/auth/auth-flow';

export const metadata: Metadata = { title: 'Sign up' };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthFlow mode="signup" />
    </Suspense>
  );
}
