import { router, type Href } from 'expo-router';
import {
  ChevronRight,
  FileText,
  LogOut,
  MonitorSmartphone,
  Repeat,
  Settings,
  Tags,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@paipai/shared/tokens';
import { useSnackbar } from '@/components/snackbar';
import { Card, Skeleton, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { unregisterPush } from '@/lib/notifications';
import { clearQueue } from '@/lib/offline-queue';
import { useMe } from '@/lib/queries';
import { queryClient, signOutAndClear } from '@/lib/query-client';
import { useTheme } from '@/theme/theme';

function Row({
  icon,
  label,
  onPress,
  danger,
  chevron,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 px-5 active:bg-surface-muted"
    >
      {icon}
      <Text weight="medium" className={`flex-1 ${danger ? 'text-expense' : ''}`}>
        {label}
      </Text>
      {chevron && <ChevronRight size={18} color={colors.textSecondary} />}
    </Pressable>
  );
}

/** Sign out locally: drop this device's push token and offline queue too. */
async function fullSignOut(allDevices = false) {
  await unregisterPush();
  await clearQueue();
  await signOutAndClear({ allDevices });
}

export default function Profile() {
  const { data: me } = useMe();
  const { colors } = useTheme();
  const snack = useSnackbar();
  const [busy, setBusy] = useState(false);
  const go = (href: Href) => router.push(href);

  const initials = (me?.name ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const logoutAll = () =>
    Alert.alert('Log out from all devices?', 'You will be signed out on every phone and browser.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out everywhere', style: 'destructive', onPress: () => void fullSignOut(true) },
    ]);

  const deleteAccount = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all your expenses, categories, budgets and recurring rules. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.deleteMe();
              await clearQueue();
              await authClient.signOut().catch(() => undefined);
              queryClient.clear();
            } catch {
              snack({ message: 'Could not delete your account. Please try again.', tone: 'error' });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );

  const divider = <View className="mx-5 h-px bg-border" />;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-4">
        <Text
          weight="display"
          className="px-1 text-[34px] leading-[40px]"
          accessibilityRole="header"
        >
          Profile
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => go('/settings')}
        >
          <Card className="flex-row items-center gap-4">
            {me?.image ? (
              <Image
                source={{ uri: me.image }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-muted">
                <Text weight="semibold" className="text-base text-muted-foreground">
                  {initials}
                </Text>
              </View>
            )}
            <View className="flex-1">
              {me ? (
                <>
                  <Text weight="bold" className="text-lg" numberOfLines={1}>
                    {me.name}
                  </Text>
                  <Text muted className="text-sm" numberOfLines={1}>
                    {me.email}
                  </Text>
                  <Text muted className="text-xs">
                    {me.currency} · {me.timezone}
                  </Text>
                </>
              ) : (
                <Skeleton className="h-12 w-40" />
              )}
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Card>
        </Pressable>

        <Card className="px-0 py-1">
          <Row
            icon={<Settings size={20} color={colors.text} />}
            label="Settings"
            onPress={() => go('/settings')}
            chevron
          />
          {divider}
          <Row
            icon={<Tags size={20} color={colors.text} />}
            label="Categories"
            onPress={() => go('/categories')}
            chevron
          />
          {divider}
          <Row
            icon={<Repeat size={20} color={colors.text} />}
            label="Recurring"
            onPress={() => go('/recurring')}
            chevron
          />
          {divider}
          <Row
            icon={<FileText size={20} color={colors.text} />}
            label="Monthly report & export"
            onPress={() => go('/report')}
            chevron
          />
        </Card>

        <Card className="px-0 py-1">
          <Row
            icon={<LogOut size={20} color={colors.text} />}
            label="Log out"
            onPress={() => void fullSignOut()}
          />
          {divider}
          <Row
            icon={<MonitorSmartphone size={20} color={colors.text} />}
            label="Log out from all devices"
            onPress={logoutAll}
          />
          {divider}
          <Row
            icon={<Trash2 size={20} color={palette.expense} />}
            label={busy ? 'Deleting…' : 'Delete account'}
            onPress={deleteAccount}
            danger
          />
        </Card>

        <Text muted className="text-center text-xs">
          PaiPai · Paai-paai ka hisaab
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
