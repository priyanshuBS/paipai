import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ClipboardPaste } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { extractOtp } from '@paipai/shared/otp';
import { OTP_RESEND_COOLDOWN_SECONDS } from '@paipai/shared/schemas';
import { OtpInput } from '@/components/otp-input';
import { Button, FieldError, Text } from '@/components/ui';
import { AuthLayout } from '@/features/auth/auth-screen';
import { authClient } from '@/lib/auth-client';
import { clearPendingSignIn, resendSecondsLeft, savePendingSignIn } from '@/lib/pending-sign-in';
import { useTheme } from '@/theme/theme';

export default function Verify() {
  const {
    email = '',
    mode = 'login',
    name,
    sentAt: sentAtParam,
  } = useLocalSearchParams<{
    email: string;
    mode: 'login' | 'signup';
    name?: string;
    sentAt?: string;
  }>();
  const { colors } = useTheme();
  const [sentAt, setSentAt] = useState(() => Number(sentAtParam) || Date.now());
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string>();
  const [needsSignup, setNeedsSignup] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(() =>
    resendSecondsLeft(sentAt, OTP_RESEND_COOLDOWN_SECONDS),
  );
  const [sending, setSending] = useState(false);

  // Count down from when the code was actually sent, so leaving the app
  // (or the app being reopened) doesn't reset the timer.
  useEffect(() => {
    const tick = () => setCooldown(resendSecondsLeft(sentAt, OTP_RESEND_COOLDOWN_SECONDS));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [sentAt]);

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
        setSentAt(0); // allow an immediate resend
      } else if (err.code === 'OTP_EXPIRED') {
        setError('This code has expired. Please request a new one.');
        setSentAt(0); // allow an immediate resend
      } else {
        setError(err.message ?? 'That code is incorrect.');
      }
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await clearPendingSignIn();
    // The session update flips the auth guard; Home offers the budget step to new accounts.
    router.replace('/');
  }

  async function pasteCode() {
    const code = extractOtp(await Clipboard.getStringAsync().catch(() => ''));
    if (!code) {
      setError('No 6-digit code found on the clipboard. Copy the code from the email first.');
      return;
    }
    setOtp(code);
    void verify(code);
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
    const now = Date.now();
    setOtp('');
    setSentAt(now);
    await savePendingSignIn({ email, mode, sentAt: now, ...(name ? { name } : {}) });
  }

  async function changeEmail() {
    await clearPendingSignIn();
    if (router.canGoBack()) router.back();
    else router.replace(mode === 'signup' ? '/signup' : '/login');
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
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Fills in the code you copied from the email"
        onPress={() => void pasteCode()}
        disabled={verifying}
        className="mt-3 h-11 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface active:opacity-70"
      >
        <ClipboardPaste size={16} color={colors.textSecondary} />
        <Text weight="medium" className="text-sm">
          Paste code
        </Text>
      </Pressable>
      {needsSignup && (
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            void clearPendingSignIn();
            router.replace({ pathname: '/signup', params: { email } });
          }}
          className="mt-2 h-11 justify-center"
        >
          <Text weight="semibold" className="text-accent">
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
          onPress={() => void changeEmail()}
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
            className={cooldown > 0 ? 'text-muted-foreground' : 'text-accent'}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend code'}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
