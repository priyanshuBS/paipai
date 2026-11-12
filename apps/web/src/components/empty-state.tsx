import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted-foreground">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
