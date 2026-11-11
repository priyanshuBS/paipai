import { useLocalSearchParams } from 'expo-router';
import { AuthDetailsForm, AuthFooterLink, AuthLayout } from '@/features/auth/auth-screen';

export default function Login() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in with a one-time code sent to your email."
      footer={<AuthFooterLink mode="login" />}
    >
      <AuthDetailsForm mode="login" {...(email ? { initialEmail: email } : {})} />
    </AuthLayout>
  );
}
