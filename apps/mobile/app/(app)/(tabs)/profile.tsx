import { LogOut, MonitorSmartphone, Moon, Sun, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@paipai/shared/tokens';
import { useSnackbar } from '@/components/snackbar';
import { Card, Segmented, Skeleton, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/queries';
import { queryClient, signOutAndClear } from '@/lib/query-client';
import { authClient } from '@/lib/auth-client';
import { useTheme, type ThemePreference } from '@/theme/theme';

function Row({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 px-5 active:bg-surface-muted"
    >
      {icon}
      <Text weight="medium" className={danger ? 'text-expense' : ''}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Profile() {
  const { data: me } = useMe();
  const { preference, setPreference, colors } = useTheme();
  const snack = useSnackbar();
  const [busy, setBusy] = useState(false);

  const initials = (me?.name ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const logoutAll = () =>
    Alert.alert('Log out from all devices?', 'You will be signed out on every phone and browser.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out everywhere',
        style: 'destructive',
        onPress: () => void signOutAndClear({ allDevices: true }),
      },
    ]);

  const deleteAccount = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all your expenses, categories and budgets. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.deleteMe();
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-10 pt-4">
        <Text weight="extrabold" className="px-1 text-[28px]" accessibilityRole="header">
          Profile
        </Text>

        <Card className="flex-row items-center gap-4">
          {me?.image ? (
            <Image
              source={{ uri: me.image }}
              style={{ width: 56, height: 56, borderRadius: 28 }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-full bg-lime">
              <Text weight="bold" className="text-lg text-forest">
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
        </Card>

        <Card>
          <Text weight="semibold" className="mb-3 text-base">
            Theme
          </Text>
          <Segmented<ThemePreference>
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
          <View className="mt-3 flex-row justify-around opacity-60" accessibilityElementsHidden>
            <Sun size={16} color={colors.text} />
            <Moon size={16} color={colors.text} />
            <MonitorSmartphone size={16} color={colors.text} />
          </View>
        </Card>

        <Card className="px-0 py-1">
          <Row
            icon={<LogOut size={20} color={colors.text} />}
            label="Log out"
            onPress={() => void signOutAndClear()}
          />
          <View className="mx-5 h-px bg-border" />
          <Row
            icon={<MonitorSmartphone size={20} color={colors.text} />}
            label="Log out from all devices"
            onPress={logoutAll}
          />
          <View className="mx-5 h-px bg-border" />
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
