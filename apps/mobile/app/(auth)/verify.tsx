import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { OTP_RESEND_COOLDOWN_SECONDS } from '@paipai/shared/schemas';
import { OtpInput } from '@/components/otp-input';
import { Button, FieldError, Text } from '@/components/ui';
import { AuthLayout } from '@/features/auth/auth-screen';
import { authClient } from '@/lib/auth-client';

export default function Verify() {
  const {
    email = '',
    mode = 'login',
    name,
  } = useLocalSearchParams<{ email: string; mode: 'login' | 'signup'; name?: string }>();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string>();
  const [needsSignup, setNeedsSignup] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(OTP_RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(code: string) {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    setError(undefined);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { error: err } = await authClient.signIn.emailOtp({
      email,
      otp: code,
      ...(mode === 'signup' && name ? { name, timezone } : {}),
    });
    setVerifying(false);
    if (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setOtp('');
      if (err.code === 'NAME_REQUIRED') {
        setNeedsSignup(true);
        setError('No account found for this email.');
      } else if (err.code === 'TOO_MANY_ATTEMPTS') {
        setError('Too many wrong attempts. Please request a new code.');
        setCooldown(0);
      } else if (err.code === 'OTP_EXPIRED') {
        setError('This code has expired. Please request a new one.');
        setCooldown(0);
      } else {
        setError(err.message ?? 'That code is incorrect.');
      }
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // The session update flips the auth guard; Home offers the budget step to new accounts.
    router.replace('/');
  }

  async function resend() {
    setSending(true);
    setError(undefined);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    });
    setSending(false);
    if (err) {
      setError(err.message ?? 'Could not send a new code.');
      return;
    }
    setOtp('');
    setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
  }

  return (
    <AuthLayout
      title="Enter the code"
      subtitle={
        <Text muted>
          We sent a 6-digit code to <Text weight="semibold">{email}</Text>. It expires in 10
          minutes.
        </Text>
      }
    >
      <OtpInput
        value={otp}
        onChange={setOtp}
        onComplete={(c) => void verify(c)}
        invalid={!!error}
        disabled={verifying}
      />
      <FieldError>{error}</FieldError>
      {needsSignup && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace({ pathname: '/signup', params: { email } })}
          className="mt-2 h-11 justify-center"
        >
          <Text weight="bold" className="text-forest-mid dark:text-lime">
            Create an account instead
          </Text>
        </Pressable>
      )}
      <Button
        title={mode === 'signup' ? 'Create account' : 'Log in'}
        size="lg"
        className="mt-6"
        loading={verifying}
        disabled={otp.length !== 6}
        onPress={() => void verify(otp)}
      />
      <View className="mt-4 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="h-11 justify-center"
        >
          <Text muted weight="medium">
            ← Change email
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          disabled={cooldown > 0 || sending}
          onPress={() => void resend()}
          className="h-11 justify-center"
        >
          <Text
            weight="semibold"
            className={cooldown > 0 ? 'text-muted-foreground' : 'text-forest-mid dark:text-lime'}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend code'}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
