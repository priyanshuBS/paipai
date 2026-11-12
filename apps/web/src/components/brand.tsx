import { cn } from '@/lib/utils';

/**
 * Mark: a saffron tile with two midnight ledger bars of decreasing length.
 * Fixed colours, so it reads the same on paper, dark and the navy hero surfaces.
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
      <rect width="24" height="24" rx="7" fill="#F26B1D" />
      <rect x="6" y="7" width="12" height="3" rx="1.5" fill="#0B1020" />
      <rect x="6" y="14" width="7" height="3" rx="1.5" fill="#0B1020" opacity="0.55" />
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
