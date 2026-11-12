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
 * Category tile: a soft tint of the category's chart colour behind the icon in
 * full colour. Colours are the validated chart palette, so they stay legible
 * in light and dark mode.
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
      ? 'size-8 rounded-[9px]'
      : size === 'lg'
        ? 'size-12 rounded-2xl'
        : 'size-10 rounded-xl';
  const iconDims = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-[18px]';
  const light = chartColorFor(color, 'light');
  const dark = chartColorFor(color, 'dark');
  const style = {
    '--cat-light': light,
    '--cat-dark': dark,
    '--cat-light-bg': light + '26',
    '--cat-dark-bg': dark + '2E',
  } as CSSProperties;
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-[var(--cat-light-bg)] text-[var(--cat-light)] dark:bg-[var(--cat-dark-bg)] dark:text-[var(--cat-dark)]',
        dims,
        className,
      )}
      style={style}
    >
      <Icon className={iconDims} strokeWidth={2} />
    </span>
  );
}
