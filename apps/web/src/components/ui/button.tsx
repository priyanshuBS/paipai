import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** Deep forest green pill, white text */
        primary:
          'bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:brightness-110',
        /** Lime pill, dark green text */
        secondary: 'bg-accent text-accent-foreground hover:brightness-95',
        soft: 'bg-accent-soft text-accent-foreground hover:brightness-95 dark:text-foreground',
        outline: 'border border-border bg-surface text-foreground hover:bg-surface-muted',
        ghost: 'text-foreground hover:bg-surface-muted',
        destructive: 'bg-expense text-white hover:brightness-110',
        link: 'text-forest-mid underline-offset-4 hover:underline dark:text-lime',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-base',
        icon: 'size-11',
        'icon-sm': 'size-9',
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

/** Secondary pill with a small circular icon on the left. */
export function IconPill({
  icon,
  children,
  className,
  ...props
}: ButtonProps & { icon: React.ReactNode }) {
  return (
    <Button variant="secondary" className={cn('pl-1.5', className)} {...props}>
      <span className="flex size-8 items-center justify-center rounded-full bg-forest text-lime">
        {icon}
      </span>
      {children}
    </Button>
  );
}
