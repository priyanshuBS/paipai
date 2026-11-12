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
import { chartColorFor } from '@paipai/shared/tokens';
import { useTheme } from '@/theme/theme';

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

const SIZES = { sm: { box: 34, icon: 16 }, md: { box: 40, icon: 18 }, lg: { box: 52, icon: 24 } };

/**
 * Category tile: a soft tint of the category's chart colour behind the icon in
 * full colour (validated palette, legible in light and dark).
 */
export function CategoryIcon({
  icon,
  color,
  size = 'md',
}: {
  icon?: string | null;
  color?: string | null;
  size?: keyof typeof SIZES;
}) {
  const { dark } = useTheme();
  const Icon = (icon && CATEGORY_ICONS[icon]) || CircleHelp;
  const s = SIZES[size];
  const tint = chartColorFor(color, dark ? 'dark' : 'light');
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.box * 0.3,
        backgroundColor: tint + (dark ? '2E' : '1A'),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={s.icon} color={tint} strokeWidth={2} />
    </View>
  );
}
