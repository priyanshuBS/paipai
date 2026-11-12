import {
  Baby,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  CircleEllipsis,
  CircleHelp,
  Clapperboard,
  Coffee,
  Dog,
  Droplet,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Lightbulb,
  Music,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Repeat,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Store,
  TrainFront,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { chartColorFor } from '@paipai/shared/tokens';
import { cn } from '@/lib/utils';

/** Static map (tree-shakeable) of every icon offered for categories. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  bus: Bus,
  car: Car,
  bike: Bike,
  'train-front': TrainFront,
  plane: Plane,
  fuel: Fuel,
  utensils: Utensils,
  coffee: Coffee,
  pizza: Pizza,
  'shopping-basket': ShoppingBasket,
  'shopping-bag': ShoppingBag,
  shirt: Shirt,
  receipt: Receipt,
  house: House,
  lightbulb: Lightbulb,
  droplet: Droplet,
  'heart-pulse': HeartPulse,
  pill: Pill,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  clapperboard: Clapperboard,
  'gamepad-2': Gamepad2,
  music: Music,
  smartphone: Smartphone,
  wifi: Wifi,
  gift: Gift,
  sparkles: Sparkles,
  scissors: Scissors,
  dumbbell: Dumbbell,
  baby: Baby,
  dog: Dog,
  wrench: Wrench,
  briefcase: Briefcase,
  store: Store,
  laptop: Laptop,
  wallet: Wallet,
  'piggy-bank': PiggyBank,
  landmark: Landmark,
  'hand-coins': HandCoins,
  'circle-ellipsis': CircleEllipsis,
  'circle-help': CircleHelp,
  repeat: Repeat,
};

/**
 * Category tile: neutral square, icon drawn in the category's chart colour
 * (validated for contrast in both themes). Identity without pastel blobs.
 */
export function CategoryIcon({
  icon,
  color,
  size = 'md',
  className,
}: {
  icon?: string | null;
  color?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || CircleHelp;
  const dims =
    size === 'sm'
      ? 'size-8 rounded-md'
      : size === 'lg'
        ? 'size-12 rounded-xl'
        : 'size-9 rounded-lg';
  const iconDims = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-[18px]';
  const style = {
    '--cat-light': chartColorFor(color, 'light'),
    '--cat-dark': chartColorFor(color, 'dark'),
  } as CSSProperties;
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center border border-border bg-surface-muted text-[var(--cat-light)] dark:text-[var(--cat-dark)]',
        dims,
        className,
      )}
      style={style}
    >
      <Icon className={iconDims} strokeWidth={1.75} />
    </span>
  );
}
