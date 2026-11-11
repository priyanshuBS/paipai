import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Rect, Text as SvgText } from 'react-native-svg';
import { palette } from '@paipai/shared/tokens';
import { useTheme } from '@/theme/theme';
import { Text } from './ui';

function WalletIllustration() {
  const { colors } = useTheme();
  return (
    <Svg width={150} height={112} viewBox="0 0 160 120" accessibilityElementsHidden>
      <Ellipse cx={80} cy={108} rx={56} ry={6} fill={colors.surfaceMuted} />
      <Rect x={26} y={34} width={108} height={66} rx={18} fill={palette.lime} />
      <Rect x={26} y={34} width={108} height={22} rx={11} fill={palette.forest} opacity={0.92} />
      <Rect x={98} y={58} width={36} height={24} rx={12} fill={palette.limeLight} />
      <Circle cx={112} cy={70} r={5} fill={palette.forest} />
      <Circle
        cx={56}
        cy={22}
        r={12}
        fill={palette.limeLight}
        stroke={palette.forest}
        strokeWidth={3}
      />
      <SvgText
        x={56}
        y={27}
        textAnchor="middle"
        fontSize={13}
        fontWeight="800"
        fill={palette.forest}
      >
        ₹
      </SvgText>
      <Circle cx={84} cy={14} r={8} fill={palette.lime} stroke={palette.forest} strokeWidth={2.5} />
    </Svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View className="items-center px-4 py-10">
      <WalletIllustration />
      <Text weight="semibold" className="mt-4 text-center text-base">
        {title}
      </Text>
      {description && (
        <Text muted className="mt-1 max-w-xs text-center text-sm">
          {description}
        </Text>
      )}
      {action && <View className="mt-5">{action}</View>}
    </View>
  );
}
