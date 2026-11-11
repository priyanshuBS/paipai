'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

/** Six separate digit boxes with paste support and auto-advance. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const set = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
      set(value.slice(0, i - 1));
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const clean = set(e.clipboardData.getData('text'));
    refs.current[Math.min(clean.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          pattern="\d*"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          autoFocus={i === 0}
          value={d}
          onKeyDown={onKeyDown(i)}
          onPaste={onPaste}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            const next = (value.slice(0, i) + ch + value.slice(i + 1)).slice(0, length);
            set(next);
            if (ch && i < length - 1) refs.current[i + 1]?.focus();
          }}
          className={cn(
            'h-14 w-full min-w-0 rounded-2xl border bg-surface text-center text-2xl font-bold tabular-nums text-foreground transition focus:border-forest-mid focus:outline-none focus:ring-4 focus:ring-lime/30',
            invalid ? 'border-expense' : 'border-border',
            d && !invalid && 'border-forest-mid bg-accent-soft dark:bg-surface-muted',
          )}
        />
      ))}
    </div>
  );
}
