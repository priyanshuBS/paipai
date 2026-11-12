import Svg, { Rect } from 'react-native-svg';
import { View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { Text } from './ui';

/** Mark: an ink tile with two ledger bars. Follows the theme unless colours are given. */
export function LogoMark({
  size = 28,
  color,
  inner,
}: {
  size?: number;
  color?: string;
  inner?: string;
}) {
  const { colors } = useTheme();
  const tile = color ?? colors.text;
  const bars = inner ?? colors.background;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="PaiPai">
      <Rect width={24} height={24} rx={6} fill={tile} />
      <Rect x={6} y={7} width={12} height={3} rx={1.5} fill={bars} />
      <Rect x={6} y={14} width={7} height={3} rx={1.5} fill={bars} opacity={0.6} />
    </Svg>
  );
}

export function Logo() {
  return (
    <View className="flex-row items-center gap-2">
      <LogoMark size={26} />
      <Text weight="semibold" className="text-lg tracking-tight">
        PaiPai
      </Text>
    </View>
  );
}
