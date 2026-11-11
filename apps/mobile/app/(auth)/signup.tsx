import { useLocalSearchParams } from 'expo-router';
import { AuthDetailsForm, AuthFooterLink, AuthLayout } from '@/features/auth/auth-screen';

export default function Signup() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking every rupee in seconds."
      footer={<AuthFooterLink mode="signup" />}
    >
      <AuthDetailsForm mode="signup" {...(email ? { initialEmail: email } : {})} />
    </AuthLayout>
  );
}
