import { clsx, type ClassValue } from 'clsx';
import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps as RNTextProps,
  type ViewProps,
} from 'react-native';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '@/theme/theme';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
const WEIGHT: Record<Weight, string> = {
  regular: 'font-inter',
  medium: 'font-inter-medium',
  semibold: 'font-inter-semibold',
  bold: 'font-inter-bold',
  extrabold: 'font-inter-extrabold',
};

export interface TextProps extends RNTextProps {
  weight?: Weight;
  muted?: boolean;
  className?: string;
}

/** Inter text. Weight maps to a font file (Android ignores fontWeight with custom fonts). */
export function Text({ weight = 'regular', muted, className, ...props }: TextProps) {
  return (
    <RNText
      className={cn(WEIGHT[weight], muted ? 'text-muted-foreground' : 'text-foreground', className)}
      maxFontSizeMultiplier={1.6}
      {...props}
    />
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'outline' | 'ghost' | 'destructive';

const BTN: Record<ButtonVariant, { box: string; text: string }> = {
  primary: { box: 'bg-primary', text: 'text-primary-foreground' },
  secondary: { box: 'bg-accent', text: 'text-accent-foreground' },
  soft: { box: 'bg-accent-soft', text: 'text-accent-foreground dark:text-foreground' },
  outline: { box: 'border border-border bg-surface', text: 'text-foreground' },
  ghost: { box: 'bg-transparent', text: 'text-foreground' },
  destructive: { box: 'bg-expense', text: 'text-white' },
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}

/** Pill-shaped button (min 44pt tap target). */
export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  className,
  ...props
}: ButtonProps) {
  const v = BTN[variant];
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-full px-5 active:opacity-80',
        size === 'lg' ? 'h-14' : 'h-12',
        v.box,
        (disabled || loading) && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.primaryForeground : colors.text}
          size="small"
        />
      ) : (
        icon
      )}
      <Text weight="semibold" className={cn(size === 'lg' ? 'text-base' : 'text-[15px]', v.text)}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Lime pill with a small dark circular icon on the left. */
export function IconPill({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-12 flex-row items-center gap-2 rounded-full bg-accent pl-1.5 pr-4 active:opacity-80"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-forest">{icon}</View>
      <Text weight="semibold" className="text-sm text-accent-foreground">
        {title}
      </Text>
    </Pressable>
  );
}

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('rounded-card bg-surface p-5', className)}
      style={{
        shadowColor: '#111',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
      {...props}
    />
  );
}

export const Input = forwardRef<
  React.ComponentRef<typeof TextInput>,
  TextInputProps & { className?: string; invalid?: boolean }
>(({ className, invalid, ...props }, ref) => {
  const { colors } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textSecondary}
      className={cn(
        'h-12 rounded-2xl border bg-surface px-4 font-inter text-[15px] text-foreground',
        invalid ? 'border-expense' : 'border-border',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text weight="medium" className={cn('mb-1.5 text-sm', className)}>
      {children}
    </Text>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" className="mt-1.5 text-sm text-expense">
      {children}
    </Text>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  left,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  left?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      className={cn(
        'h-11 min-w-11 flex-row items-center justify-center gap-1.5 rounded-full border px-4',
        selected
          ? 'border-forest bg-forest dark:border-lime dark:bg-lime'
          : 'border-border bg-surface',
      )}
    >
      {left}
      <Text
        weight="medium"
        className={cn('text-sm', selected ? 'text-white dark:text-forest' : 'text-foreground')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      className={cn('flex-row rounded-full bg-surface-muted p-1', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => onChange(o.value)}
            className={cn(
              'h-10 flex-1 items-center justify-center rounded-full px-3',
              active && 'bg-surface',
            )}
          >
            <Text weight="semibold" className={cn('text-sm', !active && 'text-muted-foreground')}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <View accessibilityElementsHidden className={cn('rounded-xl bg-surface-muted', className)} />
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View
      accessibilityRole="alert"
      className="items-center gap-3 rounded-2xl bg-expense/5 px-4 py-8"
    >
      <Text className="text-center text-sm">
        {message ?? 'Something went wrong while loading this.'}
      </Text>
      {onRetry && <Button title="Try again" variant="outline" onPress={onRetry} />}
    </View>
  );
}
