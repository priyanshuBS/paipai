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
};

/** Circular category avatar: pastel background, dark icon. */
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
  const dims = size === 'sm' ? 'size-9' : size === 'lg' ? 'size-14' : 'size-11';
  const iconDims = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5';
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full text-forest',
        dims,
        className,
      )}
      style={{ backgroundColor: color ?? '#E4F5C8' }}
    >
      <Icon className={iconDims} strokeWidth={2} />
    </span>
  );
}
