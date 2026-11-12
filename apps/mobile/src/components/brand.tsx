import Svg, { Rect } from 'react-native-svg';
import { View } from 'react-native';
import { Text, cn } from './ui';

/** Mark: a saffron tile with two midnight ledger bars (fixed colours, reads on any background). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="PaiPai">
      <Rect width={24} height={24} rx={7} fill="#F26B1D" />
      <Rect x={6} y={7} width={12} height={3} rx={1.5} fill="#0B1020" />
      <Rect x={6} y={14} width={7} height={3} rx={1.5} fill="#0B1020" opacity={0.55} />
    </Svg>
  );
}

export function Logo({ onHero }: { onHero?: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      <LogoMark size={26} />
      <Text
        weight="semibold"
        className={cn('text-lg tracking-tight', onHero && 'text-hero-foreground')}
      >
        PaiPai
      </Text>
    </View>
  );
}
