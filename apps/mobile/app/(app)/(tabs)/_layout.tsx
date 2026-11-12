import type { BottomTabBarProps } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { Tabs, router } from 'expo-router';
import { ChartColumn, House, Plus, Target, User, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/theme';

const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: House, label: 'Home' },
  analytics: { icon: ChartColumn, label: 'Analytics' },
  budgets: { icon: Target, label: 'Budgets' },
  profile: { icon: User, label: 'Profile' },
};

/** 5 tabs: Home, Analytics, Add (centre, ink), Budgets, Profile. Active = ink, inactive = muted. */
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const active = colors.text;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 6,
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        if (route.name === 'add') {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel="Add expense"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/add-transaction');
              }}
              style={{
                width: 48,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={22} color={colors.primaryForeground} strokeWidth={2.25} />
            </Pressable>
          );
        }
        const meta = ICONS[route.name];
        if (!meta) return null;
        const Icon = meta.icon;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            onPress={() => {
              if (!focused) navigateToTab(route.key);
            }}
            style={{
              minWidth: 60,
              minHeight: 50,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <Icon
              size={21}
              color={focused ? active : colors.textSecondary}
              strokeWidth={focused ? 2 : 1.75}
            />
            <Text
              weight="medium"
              className="text-[11px]"
              style={{ color: focused ? active : colors.textSecondary }}
            >
              {meta.label}
            </Text>
            <View
              style={{
                width: 16,
                height: 2,
                borderRadius: 1,
                backgroundColor: focused ? colors.accent : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="budgets" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
