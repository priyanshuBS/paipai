import { Redirect } from 'expo-router';
import { useSession } from '@/lib/auth-client';
import { useOnboarded } from '@/lib/onboarding';

/** Entry: dashboard when signed in, otherwise intro slides (first launch) or login. */
export default function Index() {
  const { data: session } = useSession();
  const onboarded = useOnboarded();
  if (session?.user) return <Redirect href="/(app)/(tabs)" />;
  if (onboarded === null) return null;
  return <Redirect href={onboarded ? '/login' : '/onboarding'} />;
}
