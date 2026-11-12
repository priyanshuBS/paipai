import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { formatMoney } from '@paipai/shared/money';
import { Text, cn, type TextProps } from './ui';

/** Animated count-up for headline amounts (skipped when Reduce Motion is on). */
export function CountUp({
  value,
  hidden,
  ...props
}: { value: number; hidden?: boolean } & TextProps) {
  const [display, setDisplay] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const start = from.current;
    from.current = value;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce || start === value) {
          setDisplay(value);
          return;
        }
        const t0 = Date.now();
        const tick = () => {
          const t = Math.min(1, (Date.now() - t0) / 700);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(start + (value - start) * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <Text
      accessibilityLabel={hidden ? 'Amount hidden' : formatMoney(value)}
      style={{ fontVariant: ['tabular-nums'] }}
      {...props}
    >
      {hidden ? '₹ • • • • •' : formatMoney(display)}
    </Text>
  );
}

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
    <Text
      weight="semibold"
      className={cn(type === 'expense' ? 'text-foreground' : 'text-income', className)}
      style={{ fontVariant: ['tabular-nums'] }}
    >
      {type === 'expense' ? '−' : '+'}
      {formatMoney(amount)}
    </Text>
  );
}
