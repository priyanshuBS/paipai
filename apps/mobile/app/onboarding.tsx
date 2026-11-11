import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { palette } from '@paipai/shared/tokens';
import { Logo } from '@/components/brand';
import { Button, Text } from '@/components/ui';
import { markOnboarded } from '@/lib/onboarding';

const F = palette.forest;
const L = palette.limeLight;

function AddIllustration() {
  return (
    <Svg width={240} height={220} viewBox="0 0 240 220">
      <Circle cx={120} cy={110} r={96} fill={L} opacity={0.6} />
      <Rect x={62} y={38} width={116} height={150} rx={22} fill="#fff" />
      <Rect x={78} y={58} width={84} height={34} rx={12} fill={L} />
      <SvgText x={92} y={82} fontSize={20} fontWeight="700" fill={F}>
        ₹ 30
      </SvgText>
      <Rect x={78} y={102} width={84} height={12} rx={6} fill="#E6E9E1" />
      <Rect x={78} y={122} width={56} height={12} rx={6} fill="#E6E9E1" />
      <Rect x={78} y={148} width={84} height={26} rx={13} fill={F} />
      <Circle cx={182} cy={52} r={20} fill={F} />
      <Path d="M182 42v20M172 52h20" stroke={palette.lime} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

function ChartIllustration() {
  const bars = [40, 70, 35, 95, 60, 80, 50];
  return (
    <Svg width={240} height={220} viewBox="0 0 240 220">
      <Circle cx={120} cy={110} r={96} fill={L} opacity={0.6} />
      <Rect x={40} y={50} width={160} height={124} rx={22} fill="#fff" />
      <G>
        {bars.map((h, i) => (
          <Rect
            key={i}
            x={58 + i * 19}
            y={158 - h}
            width={12}
            height={h}
            rx={4}
            fill={i === 3 ? F : palette.lime}
          />
        ))}
      </G>
    </Svg>
  );
}

function BudgetIllustration() {
  return (
    <Svg width={240} height={220} viewBox="0 0 240 220">
      <Circle cx={120} cy={110} r={96} fill={L} opacity={0.6} />
      <Circle cx={120} cy={110} r={58} fill="none" stroke="#fff" strokeWidth={18} />
      <Path
        d="M120 52 A58 58 0 1 1 64 126"
        fill="none"
        stroke={F}
        strokeWidth={18}
        strokeLinecap="round"
      />
      <SvgText x={120} y={118} fontSize={24} fontWeight="800" fill={F} textAnchor="middle">
        72%
      </SvgText>
    </Svg>
  );
}

const SLIDES = [
  {
    key: 'add',
    title: 'Add expenses in seconds',
    body: 'Type “Au” and PaiPai fills in “Auto fare” with its usual category. Amount, save, done.',
    Art: AddIllustration,
  },
  {
    key: 'insights',
    title: 'See where every rupee goes',
    body: 'Daily, weekly and monthly trends, category splits, and item-wise totals like “Auto fare: ₹1,240”.',
    Art: ChartIllustration,
  },
  {
    key: 'budget',
    title: 'Stay on budget',
    body: 'Set a monthly budget and PaiPai nudges you before you overspend. Paai-paai ka hisaab.',
    Art: BudgetIllustration,
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList>(null);
  const onViewable = useRef(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    const i = viewableItems[0]?.index;
    if (typeof i === 'number') setIndex(i);
  }).current;

  const finish = async (to: '/signup' | '/login') => {
    await markOnboarded();
    router.replace(to);
  };

  return (
    <SafeAreaView className="flex-1 bg-lime" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Logo />
        {index < SLIDES.length - 1 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void finish('/signup')}
            className="h-11 justify-center px-2"
          >
            <Text weight="semibold" className="text-forest">
              Skip
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1 items-center justify-center px-8">
            <item.Art />
            <Text weight="extrabold" className="mt-8 text-center text-[30px] leading-9 text-forest">
              {item.title}
            </Text>
            <Text className="mt-3 text-center text-base leading-6 text-forest/80">{item.body}</Text>
          </View>
        )}
      />

      <View className="items-center gap-4 px-6 pb-4">
        <View
          className="flex-row gap-2"
          accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              className={
                i === index ? 'h-2 w-6 rounded-full bg-forest' : 'h-2 w-2 rounded-full bg-forest/30'
              }
            />
          ))}
        </View>
        {index < SLIDES.length - 1 ? (
          <Button
            title="Next"
            size="lg"
            className="w-full"
            onPress={() => list.current?.scrollToIndex({ index: index + 1 })}
          />
        ) : (
          <Button
            title="Get Started"
            size="lg"
            className="w-full"
            onPress={() => void finish('/signup')}
          />
        )}
        <Pressable
          accessibilityRole="link"
          onPress={() => void finish('/login')}
          className="h-11 justify-center"
        >
          <Text className="text-forest">
            Already have an account?{' '}
            <Text weight="bold" className="text-forest">
              Login
            </Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
