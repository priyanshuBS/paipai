import { cn } from '@/lib/utils';

/** Geometric mark: three rounded squares forming a stylised "P". */
export function LogoMark({ className, title = 'PaiPai' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} role="img" aria-label={title}>
      <rect x="3" y="3" width="12" height="12" rx="3.5" fill="currentColor" />
      <rect x="17" y="3" width="12" height="12" rx="3.5" fill="currentColor" />
      <rect x="3" y="17" width="12" height="12" rx="3.5" fill="currentColor" />
      <rect x="17" y="17" width="12" height="12" rx="6" fill="currentColor" opacity="0.28" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-forest dark:text-lime', className)}>
      <LogoMark className={markClassName} title="" />
      <span className="text-xl font-extrabold tracking-tight">PaiPai</span>
    </span>
  );
}
