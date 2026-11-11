import Svg, { Rect } from 'react-native-svg';
import { View } from 'react-native';
import { Text } from './ui';

/** Geometric mark: three rounded squares forming a stylised "P". */
export function LogoMark({ size = 32, color = '#1E3A1A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityLabel="PaiPai">
      <Rect x={3} y={3} width={12} height={12} rx={3.5} fill={color} />
      <Rect x={17} y={3} width={12} height={12} rx={3.5} fill={color} />
      <Rect x={3} y={17} width={12} height={12} rx={3.5} fill={color} />
      <Rect x={17} y={17} width={12} height={12} rx={6} fill={color} opacity={0.28} />
    </Svg>
  );
}

export function Logo({ color = '#1E3A1A' }: { color?: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <LogoMark size={30} color={color} />
      <Text weight="extrabold" className="text-xl" style={{ color }}>
        PaiPai
      </Text>
    </View>
  );
}
