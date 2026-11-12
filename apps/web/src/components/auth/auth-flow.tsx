'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ClipboardPaste } from 'lucide-react';
import { extractOtp } from '@paipai/shared/otp';
import { emailSchema, nameSchema, OTP_RESEND_COOLDOWN_SECONDS } from '@paipai/shared/schemas';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/primitives';
import { authClient } from '@/lib/auth-client';
import { SITE_URL } from '@/lib/config';
import { AuthShell } from './auth-shell';
import { OtpInput } from './otp-input';

type Mode = 'login' | 'signup';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

/**
 * The code step survives the tab being reloaded or discarded (phones often do
 * this while you switch to the email app). Per-tab, and only for 10 minutes,
 * the lifetime of the code itself.
 */
const PENDING_KEY = 'paipai:pending-sign-in';
const PENDING_TTL_MS = 10 * 60 * 1000;
interface Pending {
  mode: Mode;
  email: string;
  name: string;
  sentAt: number;
}

function loadPending(mode: Mode): Pending | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null') as Pending | null;
    return p && p.mode === mode && Date.now() - p.sentAt < PENDING_TTL_MS ? p : null;
  } catch {
    return null;
  }
}
function savePending(p: Pending | null) {
  try {
    if (p) sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable: the flow still works, it just won't survive a reload */
  }
}
const secondsLeft = (sentAt: number) =>
  Math.max(0, Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - (Date.now() - sentAt) / 1000));

/** Safe in-app redirect target (no open redirects). */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/app') && !raw.startsWith('//') ? raw : '/app';
}

export function AuthFlow({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    otp?: string;
    form?: string;
  }>({});
  const [needsSignup, setNeedsSignup] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (params.get('error'))
      setErrors({ form: 'Google sign-in was cancelled or failed. Please try again.' });
  }, [params]);

  // Resume the code step after a reload / discarded tab.
  const [sentAt, setSentAt] = useState<number | null>(null);
  useEffect(() => {
    const p = loadPending(mode);
    if (!p || (params.get('email') && params.get('email') !== p.email)) return;
    setEmail(p.email);
    setName(p.name);
    setSentAt(p.sentAt);
    setCooldown(secondsLeft(p.sentAt));
    setStep('otp');
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Background tabs throttle timers; resync the countdown when the user comes back.
  useEffect(() => {
    if (sentAt === null) return;
    const sync = () => document.visibilityState === 'visible' && setCooldown(secondsLeft(sentAt));
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [sentAt]);

  async function pasteCode() {
    let text = '';
    try {
      text = (await navigator.clipboard?.readText()) ?? '';
    } catch {
      /* permission denied: fall through to the hint */
    }
    const code = extractOtp(text);
    if (!code) {
      setErrors({ otp: 'No 6-digit code found on the clipboard. Copy it from the email first.' });
      return;
    }
    setOtp(code);
    void verify(code);
  }

  async function sendCode(): Promise<boolean> {
    setSending(true);
    setErrors({});
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    setSending(false);
    if (error) {
      const retry = (error as { retryAfterSeconds?: number }).retryAfterSeconds;
      if (retry) setCooldown(retry);
      setErrors({ form: error.message ?? 'Could not send the code. Please try again.' });
      return false;
    }
    const now = Date.now();
    setSentAt(now);
    setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    savePending({ mode, email, name: name.trim(), sentAt: now });
    return true;
  }

  async function onDetails(e: FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (mode === 'signup') {
      const n = nameSchema.safeParse(name);
      if (!n.success) nextErrors.name = n.error.issues[0]?.message;
    }
    const em = emailSchema.safeParse(email);
    if (!em.success) nextErrors.email = em.error.issues[0]?.message;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setEmail(em.data ?? email);
    if (await sendCode()) {
      setOtp('');
      setStep('otp');
    }
  }

  async function verify(code: string) {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    setErrors({});
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { error } = await authClient.signIn.emailOtp({
      email,
      otp: code,
      ...(mode === 'signup' ? { name: name.trim(), timezone } : {}),
    });
    setVerifying(false);
    if (error) {
      if (error.code === 'NAME_REQUIRED') {
        setNeedsSignup(true);
        setErrors({ form: 'No account found for this email.' });
        return;
      }
      if (error.code === 'TOO_MANY_ATTEMPTS') {
        setErrors({ otp: 'Too many wrong attempts. Please request a new code.' });
        setCooldown(0);
      } else if (error.code === 'OTP_EXPIRED') {
        setErrors({ otp: 'This code has expired. Please request a new one.' });
        setCooldown(0);
      } else {
        setErrors({ otp: error.message ?? 'That code is incorrect.' });
      }
      setOtp('');
      return;
    }
    savePending(null);
    router.replace(mode === 'signup' ? '/app/welcome' : next);
    router.refresh();
  }

  async function google() {
    setGoogleLoading(true);
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${SITE_URL}${next}`,
      newUserCallbackURL: `${SITE_URL}/app/welcome`,
      errorCallbackURL: `${SITE_URL}/${mode}?error=google`,
    });
    if (error) {
      setGoogleLoading(false);
      setErrors({ form: error.message ?? 'Google sign-in is unavailable right now.' });
    }
  }

  const isSignup = mode === 'signup';

  if (step === 'otp') {
    return (
      <AuthShell
        title="Enter the code"
        subtitle={
          <>
            We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. It
            expires in 10 minutes.
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify(otp);
          }}
          className="space-y-5"
        >
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={(c) => void verify(c)}
            invalid={!!errors.otp}
            disabled={verifying}
          />
          <FieldError>{errors.otp}</FieldError>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => void pasteCode()}
            disabled={verifying}
          >
            <ClipboardPaste className="text-muted-foreground" aria-hidden /> Paste code
          </Button>
          {errors.form && (
            <div role="alert" className="rounded-lg bg-warning/10 p-4 text-sm">
              {errors.form}{' '}
              {needsSignup && (
                <Link
                  href={`/signup?email=${encodeURIComponent(email)}`}
                  className="font-medium text-accent underline"
                >
                  Create an account
                </Link>
              )}
            </div>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={verifying}
            disabled={otp.length !== 6}
          >
            {isSignup ? 'Create account' : 'Log in'}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                savePending(null);
                setStep('details');
                setErrors({});
              }}
              className="inline-flex min-h-11 items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden /> Change email
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || sending}
              onClick={() => void sendCode().then((ok) => ok && setOtp(''))}
              className="min-h-11 font-medium text-accent disabled:text-muted-foreground"
              aria-live="polite"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={isSignup ? 'Create your account' : 'Welcome back'}
      subtitle={
        isSignup
          ? 'Start tracking every rupee in seconds.'
          : 'Log in with a one-time code sent to your email.'
      }
      footer={
        isSignup ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Login
            </Link>
          </>
        ) : (
          <>
            New to PaiPai?{' '}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Create an account
            </Link>
          </>
        )
      }
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => void google()}
        loading={googleLoading}
      >
        {!googleLoading && <GoogleIcon />} Continue with Google
      </Button>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or with email{' '}
        <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={onDetails} noValidate className="space-y-4">
        {isSignup && (
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name || undefined}
              aria-describedby={errors.name ? 'name-error' : undefined}
              autoFocus
            />
            <FieldError id="name-error">{errors.name}</FieldError>
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email || undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            autoFocus={!isSignup}
          />
          <FieldError id="email-error">{errors.email}</FieldError>
        </div>
        {errors.form && (
          <p role="alert" className="rounded-lg bg-expense/10 p-3 text-sm text-expense">
            {errors.form}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={sending}
          disabled={cooldown > 0 && !sending}
        >
          {cooldown > 0 ? `Send OTP (${cooldown}s)` : 'Send OTP'}
        </Button>
      </form>
    </AuthShell>
  );
}
