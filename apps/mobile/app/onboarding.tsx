import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import { Logo } from '@/components/brand';
import { Button, Text, cn } from '@/components/ui';
import { markOnboarded } from '@/lib/onboarding';
import { useTheme } from '@/theme/theme';

/** Illustrations are small fragments of the real UI, drawn in theme colours. */
function useArt() {
  const { colors } = useTheme();
  return {
    card: colors.heroSurface,
    line: colors.heroBorder,
    muted: colors.hero,
    text: colors.heroText,
    sub: colors.heroMuted,
    accent: colors.brand,
    bar: colors.heroBorder,
  };
}

function AddIllustration() {
  const c = useArt();
  return (
    <Svg width={260} height={200} viewBox="0 0 260 200">
      <Rect x={30} y={20} width={200} height={160} rx={14} fill={c.card} stroke={c.line} />
      <Rect
        x={48}
        y={40}
        width={164}
        height={44}
        rx={10}
        fill={c.card}
        stroke={c.accent}
        strokeWidth={1.5}
      />
      <SvgText x={62} y={70} fontSize={22} fontWeight="600" fill={c.text}>
        ₹ 30
      </SvgText>
      <Rect x={48} y={96} width={164} height={28} rx={8} fill={c.card} stroke={c.line} />
      <SvgText x={60} y={115} fontSize={12} fill={c.text}>
        Auto fare
      </SvgText>
      <Rect x={48} y={136} width={52} height={24} rx={6} fill={c.muted} stroke={c.line} />
      <Rect x={106} y={136} width={52} height={24} rx={6} fill={c.muted} stroke={c.accent} />
      <Rect x={164} y={136} width={48} height={24} rx={6} fill={c.muted} stroke={c.line} />
      <SvgText x={132} y={152} fontSize={10} fill={c.accent} textAnchor="middle">
        UPI
      </SvgText>
    </Svg>
  );
}

function ChartIllustration() {
  const c = useArt();
  const bars = [40, 70, 35, 95, 60, 80, 50];
  return (
    <Svg width={260} height={200} viewBox="0 0 260 200">
      <Rect x={30} y={20} width={200} height={160} rx={14} fill={c.card} stroke={c.line} />
      <SvgText x={48} y={48} fontSize={11} fill={c.sub}>
        This week
      </SvgText>
      <SvgText x={48} y={70} fontSize={20} fontWeight="600" fill={c.text}>
        ₹3,240
      </SvgText>
      <G>
        {bars.map((h, i) => (
          <Rect
            key={i}
            x={50 + i * 24}
            y={162 - h * 0.75}
            width={14}
            height={h * 0.75}
            rx={3}
            fill={i === 3 ? c.accent : c.bar}
          />
        ))}
      </G>
    </Svg>
  );
}

function BudgetIllustration() {
  const c = useArt();
  return (
    <Svg width={260} height={200} viewBox="0 0 260 200">
      <Rect x={30} y={36} width={200} height={128} rx={14} fill={c.card} stroke={c.line} />
      <SvgText x={48} y={66} fontSize={12} fontWeight="600" fill={c.text}>
        Monthly budget
      </SvgText>
      <SvgText x={212} y={66} fontSize={11} fill={c.sub} textAnchor="end">
        72%
      </SvgText>
      <Rect x={48} y={82} width={164} height={6} rx={3} fill={c.muted} />
      <Rect x={48} y={82} width={118} height={6} rx={3} fill={c.accent} />
      <SvgText x={48} y={112} fontSize={11} fill={c.sub}>
        ₹4,200 left · 9 days to go
      </SvgText>
      <Rect x={48} y={128} width={164} height={1} fill={c.line} />
      <SvgText x={48} y={150} fontSize={11} fill={c.sub}>
        Alerts at 80% and 100%
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
    body: 'Trends by day, week and month, category splits, and item-wise totals like “Auto fare: ₹1,240”.',
    Art: ChartIllustration,
  },
  {
    key: 'budget',
    title: 'Stay on budget',
    body: 'Set a monthly budget and get a heads-up before you overspend.',
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
    <SafeAreaView className="flex-1 bg-hero" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Logo onHero />
        {index < SLIDES.length - 1 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void finish('/signup')}
            className="h-11 justify-center px-2"
          >
            <Text weight="medium" className="text-hero-muted">
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
            <Text
              weight="display"
              className="mt-8 text-center text-[38px] leading-[42px] text-hero-foreground"
            >
              {item.title}
            </Text>
            <Text className="mt-3 text-center text-[15px] leading-6 text-hero-muted">
              {item.body}
            </Text>
          </View>
        )}
      />

      <View className="items-center gap-4 px-6 pb-4">
        <View
          className="flex-row gap-1.5"
          accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              className={cn(
                'h-1.5 rounded-full',
                i === index ? 'w-5 bg-brand' : 'w-1.5 bg-hero-border',
              )}
            />
          ))}
        </View>
        {index < SLIDES.length - 1 ? (
          <Button
            title="Next"
            variant="brand"
            size="lg"
            className="w-full"
            onPress={() => list.current?.scrollToIndex({ index: index + 1 })}
          />
        ) : (
          <Button
            title="Get started"
            variant="brand"
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
          <Text className="text-hero-muted">
            Already have an account?{' '}
            <Text weight="semibold" className="text-hero-foreground">
              Log in
            </Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
