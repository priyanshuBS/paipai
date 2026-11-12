import { cn } from '@/lib/utils';

/**
 * Mark: an ink tile with two stacked bars of decreasing length, a ledger
 * line and its running total. Uses currentColor so it follows the theme.
 */
export function LogoMark({ className, title = 'PaiPai' }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-6', className)}
      role="img"
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <rect x="6" y="7" width="12" height="3" rx="1.5" className="fill-background" />
      <rect x="6" y="14" width="7" height="3" rx="1.5" className="fill-background" opacity="0.6" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <LogoMark className={markClassName} title="" />
      <span className="text-[17px] font-semibold tracking-tight">PaiPai</span>
    </span>
  );
}
