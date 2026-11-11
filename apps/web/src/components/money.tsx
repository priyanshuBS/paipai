'use client';

import { useEffect, useRef, useState } from 'react';
import { formatMoney } from '@paipai/shared/money';
import { cn } from '@/lib/utils';

/** Animated count-up for headline amounts (respects reduced motion). */
export function CountUp({
  value,
  className,
  hidden,
}: {
  value: number;
  className?: string;
  hidden?: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    fromRef.current = value;
    if (reduce || from === value) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span
      className={cn('tabular', className)}
      aria-label={hidden ? 'Amount hidden' : formatMoney(value)}
    >
      <span aria-hidden>{hidden ? '₹ • • • • •' : formatMoney(display)}</span>
    </span>
  );
}

/** Amount coloured by type: red for expense, green for income. */
export function Amount({
  amount,
  type,
  className,
}: {
  amount: number;
  type: 'expense' | 'income';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'tabular font-semibold',
        type === 'expense' ? 'text-expense' : 'text-income',
        className,
      )}
    >
      {type === 'expense' ? '−' : '+'}
      {formatMoney(amount)}
    </span>
  );
}
