import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-card border border-border bg-surface p-5 shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export function CardHeader({
  title,
  action,
  subtitle,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-[10px] border border-border-strong bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60 aria-[invalid=true]:border-expense',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 rounded-[10px] border border-border-strong bg-surface pl-3 pr-9 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-sm font-medium text-foreground', className)}
      {...props}
    />
  );
}

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-expense">
      {children}
    </p>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-muted', className)} />;
}

/** Toggleable pill chip (payment methods, filters). */
export function Chip({
  selected,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-8 min-w-10 items-center justify-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
        selected
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Segmented control (Expense/Income, period switcher). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-lg bg-surface-muted p-0.5', className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 min-w-10 rounded-md px-3 text-sm font-medium transition-colors',
            value === o.value
              ? 'bg-surface text-foreground shadow-sm ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center"
    >
      <p className="text-sm text-foreground">
        {message ?? 'Something went wrong while loading this.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-muted"
        >
          Try again
        </button>
      )}
    </div>
  );
}
