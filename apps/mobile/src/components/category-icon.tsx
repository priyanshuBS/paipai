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
} from 'lucide-react-native';
import { View } from 'react-native';
import { palette } from '@paipai/shared/tokens';

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

const SIZES = { sm: { box: 36, icon: 16 }, md: { box: 44, icon: 20 }, lg: { box: 56, icon: 24 } };

/** Circular category avatar: pastel background, dark-green icon. */
export function CategoryIcon({
  icon,
  color,
  size = 'md',
}: {
  icon?: string | null;
  color?: string | null;
  size?: keyof typeof SIZES;
}) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || CircleHelp;
  const s = SIZES[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.box / 2,
        backgroundColor: color ?? palette.limeLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={s.icon} color={palette.forest} strokeWidth={2} />
    </View>
  );
}
