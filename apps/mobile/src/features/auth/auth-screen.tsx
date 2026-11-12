import { Link, router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { emailSchema, nameSchema } from '@paipai/shared/schemas';
import { Logo } from '@/components/brand';
import { Button, FieldError, Input, Label, Text } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import { loadPendingSignIn, savePendingSignIn } from '@/lib/pending-sign-in';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow px-6 pb-8 pt-4"
        >
          <Logo />
          <View className="flex-1 justify-center py-8">
            <Text weight="semibold" className="text-[26px] leading-8 tracking-tight">
              {title}
            </Text>
            <View className="mt-2">
              {typeof subtitle === 'string' ? <Text muted>{subtitle}</Text> : subtitle}
            </View>
            <View className="mt-8">{children}</View>
          </View>
          {footer && <View className="items-center">{footer}</View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
      />
    </Svg>
  );
}

/** Step 1 of sign-up / login: (name +) email, then send the OTP. */
export function AuthDetailsForm({
  mode,
  initialEmail,
}: {
  mode: 'login' | 'signup';
  initialEmail?: string;
}) {
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [sending, setSending] = useState(false);
  const [google, setGoogle] = useState(false);

  // Came back after the app was closed mid sign-in? Resume on the code screen.
  useEffect(() => {
    void loadPendingSignIn().then((p) => {
      if (!p) return;
      router.push({
        pathname: '/verify',
        params: {
          email: p.email,
          mode: p.mode,
          sentAt: String(p.sentAt),
          ...(p.name ? { name: p.name } : {}),
        },
      });
    });
  }, []);

  async function submit() {
    const next: typeof errors = {};
    if (isSignup) {
      const n = nameSchema.safeParse(name);
      if (!n.success) next.name = n.error.issues[0]?.message;
    }
    const em = emailSchema.safeParse(email);
    if (!em.success) next.email = em.error.issues[0]?.message;
    setErrors(next);
    if (Object.keys(next).length || !em.success) return;

    setSending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: em.data,
      type: 'sign-in',
    });
    setSending(false);
    if (error) {
      setErrors({ form: error.message ?? 'Could not send the code. Please try again.' });
      return;
    }
    const sentAt = Date.now();
    const trimmed = isSignup ? name.trim() : undefined;
    await savePendingSignIn({
      email: em.data,
      mode,
      sentAt,
      ...(trimmed ? { name: trimmed } : {}),
    });
    router.push({
      pathname: '/verify',
      params: {
        email: em.data,
        mode,
        sentAt: String(sentAt),
        ...(trimmed ? { name: trimmed } : {}),
      },
    });
  }

  async function continueWithGoogle() {
    setGoogle(true);
    setErrors({});
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    });
    setGoogle(false);
    if (error) setErrors({ form: error.message ?? 'Google sign-in was cancelled or failed.' });
  }

  return (
    <View>
      <Button
        title="Continue with Google"
        variant="outline"
        size="lg"
        icon={<GoogleIcon />}
        loading={google}
        onPress={() => void continueWithGoogle()}
      />
      <View className="my-6 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text muted className="text-xs uppercase">
          or with email
        </Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      {isSignup && (
        <View className="mb-4">
          <Label>Full name</Label>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Priya Sharma"
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            returnKeyType="next"
            invalid={!!errors.name}
            accessibilityLabel="Full name"
          />
          <FieldError>{errors.name}</FieldError>
        </View>
      )}
      <View>
        <Label>Email</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={() => void submit()}
          invalid={!!errors.email}
          accessibilityLabel="Email"
        />
        <FieldError>{errors.email}</FieldError>
      </View>
      {errors.form && (
        <View className="mt-4 rounded-xl bg-expense/10 p-3">
          <Text className="text-sm text-expense">{errors.form}</Text>
        </View>
      )}
      <Button
        title="Send OTP"
        size="lg"
        className="mt-6"
        loading={sending}
        onPress={() => void submit()}
      />
    </View>
  );
}

export function AuthFooterLink({ mode }: { mode: 'login' | 'signup' }) {
  return mode === 'signup' ? (
    <Link href="/login" replace className="py-3">
      <Text muted>
        Already have an account?{' '}
        <Text weight="bold" className="text-accent">
          Login
        </Text>
      </Text>
    </Link>
  ) : (
    <Link href="/signup" replace className="py-3">
      <Text muted>
        New to PaiPai?{' '}
        <Text weight="bold" className="text-accent">
          Create an account
        </Text>
      </Text>
    </Link>
  );
}
