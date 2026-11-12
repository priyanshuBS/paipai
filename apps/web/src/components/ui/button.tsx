import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** Ink button (white in dark mode): the one main action on a screen. */
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        /** Bordered neutral button for secondary actions. */
        secondary:
          'border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted',
        /** Accent-tinted button for a highlighted secondary action. */
        soft: 'bg-accent-soft text-accent hover:bg-accent/15',
        outline:
          'border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted',
        ghost: 'text-foreground hover:bg-surface-muted',
        destructive: 'bg-expense text-white hover:bg-expense/90',
        link: 'h-auto px-0 text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <LoaderCircle className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

/** Secondary button with a leading icon (quick actions). */
export function IconPill({
  icon,
  children,
  className,
  ...props
}: ButtonProps & { icon: React.ReactNode }) {
  return (
    <Button variant="secondary" className={cn('text-foreground', className)} {...props}>
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      {children}
    </Button>
  );
}
