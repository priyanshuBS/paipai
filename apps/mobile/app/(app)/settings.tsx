import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, Camera, Check, Fingerprint } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, TIMEZONES } from '@paipai/shared/settings';
import type { ThemePreference } from '@paipai/shared/schemas';
import { useSnackbar } from '@/components/snackbar';
import { Button, Card, Input, Label, Segmented, Skeleton, Text, cn } from '@/components/ui';
import { pickAndUpload } from '@/features/receipts/receipt-picker';
import { useAppLock } from '@/lib/app-lock';
import { getReminder, setReminder, type ReminderSettings } from '@/lib/notifications';
import { useMe, useUpdateMe, useUploadsEnabled } from '@/lib/queries';
import { useTheme } from '@/theme/theme';
import { useActionErrorHandler } from '@/lib/action-errors';

function PickerModal<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/40"
        onPress={onClose}
        accessibilityLabel={`Close ${title}`}
      >
        <View className="max-h-[65%] rounded-t-[28px] bg-surface pb-8 pt-3">
          <Text weight="bold" className="px-5 pb-2 text-lg">
            {title}
          </Text>
          <ScrollView>
            {options.map((o) => (
              <Pressable
                key={o.value}
                accessibilityRole="button"
                accessibilityState={{ selected: o.value === value }}
                onPress={() => {
                  onSelect(o.value);
                  onClose();
                }}
                className={cn(
                  'min-h-12 flex-row items-center justify-between px-5',
                  o.value === value && 'bg-accent-soft dark:bg-surface-muted',
                )}
              >
                <Text weight={o.value === value ? 'semibold' : 'regular'}>{o.label}</Text>
                {o.value === value && <Check size={18} color={colors.text} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      className="min-h-14 flex-row items-center justify-between"
    >
      <Text weight="medium">{label}</Text>
      <Text muted numberOfLines={1} className="ml-4 flex-1 text-right">
        {value} ›
      </Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { data: me } = useMe();
  const update = useUpdateMe();
  const uploads = useUploadsEnabled();
  const lock = useAppLock();
  const { setPreference, colors } = useTheme();
  const snack = useSnackbar();
  const onActionError = useActionErrorHandler();
  const [name, setName] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'currency' | 'timezone'>(null);
  const [reminder, setReminderState] = useState<ReminderSettings | null>(null);
  const [timePicker, setTimePicker] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    void getReminder().then(setReminderState);
  }, []);

  if (!me) return <Skeleton className="m-4 h-96" />;

  const tzOptions = (
    TIMEZONES.some((t) => t.id === me.timezone)
      ? TIMEZONES
      : [{ id: me.timezone, label: me.timezone }, ...TIMEZONES]
  ).map((t) => ({
    value: t.id,
    label: t.label,
  }));
  const reminderDate = (() => {
    const [h, m] = (reminder?.time ?? '21:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h ?? 21, m ?? 0, 0, 0);
    return d;
  })();

  async function applyReminder(enabled: boolean, time: string) {
    try {
      setReminderState(await setReminder(enabled, time));
      if (enabled) snack(`Daily reminder set for ${time}`);
    } catch (e) {
      snack({ message: (e as Error).message, tone: 'error' });
    }
  }

  async function changeAvatar() {
    setAvatarBusy(true);
    try {
      const url = await pickAndUpload('library', 'avatar');
      if (url) {
        await update.mutateAsync({ image: url });
        snack('Photo updated');
      }
    } catch (e) {
      snack({ message: (e as Error).message || 'Could not update photo', tone: 'error' });
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1" edges={['bottom']}>
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text weight="semibold" className="mb-3 text-base">
            Profile
          </Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              disabled={!uploads || avatarBusy}
              onPress={() => void changeAvatar()}
            >
              {me.image ? (
                <Image
                  source={{ uri: me.image }}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-full border border-border bg-surface-muted">
                  <Text weight="semibold" className="text-lg text-muted-foreground">
                    {me.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              {uploads && (
                <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary">
                  <Camera size={14} color="#fff" />
                </View>
              )}
            </Pressable>
            <View className="flex-1">
              <Label>Name</Label>
              <Input value={name ?? me.name} onChangeText={setName} autoCapitalize="words" />
            </View>
          </View>
          {name !== null && name.trim() !== me.name && (
            <Button
              title="Save name"
              className="mt-3"
              loading={update.isPending}
              onPress={() =>
                void update
                  .mutateAsync({ name: name.trim() })
                  .then(() => {
                    setName(null);
                    snack('Name updated');
                  })
                  .catch(() => snack({ message: 'Please enter your full name', tone: 'error' }))
              }
            />
          )}
          <Text muted className="mt-3 text-sm">
            {me.email}
          </Text>
        </Card>

        <Card>
          <Text weight="semibold" className="mb-1 text-base">
            Preferences
          </Text>
          <Row
            label="Currency"
            value={CURRENCIES.find((c) => c.code === me.currency)?.label ?? me.currency}
            onPress={() => setPicker('currency')}
          />
          <View className="h-px bg-border" />
          <Row
            label="Time zone"
            value={tzOptions.find((t) => t.value === me.timezone)?.label ?? me.timezone}
            onPress={() => setPicker('timezone')}
          />
          <View className="h-px bg-border" />
          <Text weight="medium" className="mb-2 mt-4">
            Theme
          </Text>
          <Segmented<ThemePreference>
            value={me.theme}
            onChange={(v) => {
              setPreference(v);
              update.mutate({ theme: v });
            }}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
        </Card>

        <Card>
          <View className="flex-row items-center gap-3">
            <Bell size={18} color={colors.textSecondary} />
            <View className="flex-1">
              <Text weight="semibold">Daily reminder</Text>
              <Text muted className="text-sm">
                &quot;Did you add today&apos;s expenses?&quot;
              </Text>
            </View>
            <Switch
              accessibilityLabel="Daily reminder"
              value={reminder?.enabled ?? false}
              onValueChange={(v) => void applyReminder(v, reminder?.time ?? '21:00')}
              trackColor={{ true: colors.accent }}
            />
          </View>
          {reminder?.enabled && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setTimePicker(true)}
              className="mt-3 h-11 flex-row items-center justify-between rounded-xl bg-surface-muted px-4"
            >
              <Text>Remind me at</Text>
              <Text weight="semibold">{reminder.time}</Text>
            </Pressable>
          )}
          {timePicker && (
            <DateTimePicker
              value={reminderDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => {
                setTimePicker(Platform.OS === 'ios');
                if (e.type === 'set' && d) {
                  const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                  void applyReminder(true, t);
                }
              }}
            />
          )}
        </Card>

        <Card>
          <View className="flex-row items-center gap-3">
            <Fingerprint size={18} color={colors.textSecondary} />
            <View className="flex-1">
              <Text weight="semibold">App lock</Text>
              <Text muted className="text-sm">
                {lock.available
                  ? 'Require fingerprint / Face ID to open PaiPai'
                  : 'Set up a fingerprint or Face ID on this device first'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="App lock"
              disabled={!lock.available}
              value={lock.enabled}
              onValueChange={(v) =>
                void lock
                  .setEnabled(v)
                  .then((ok) => ok && snack(v ? 'App lock on' : 'App lock off'))
              }
              trackColor={{ true: colors.accent }}
            />
          </View>
        </Card>
      </ScrollView>

      <PickerModal
        visible={picker === 'currency'}
        title="Currency"
        options={CURRENCIES.map((c) => ({ value: c.code as string, label: c.label }))}
        value={me.currency}
        onSelect={(v) =>
          void update.mutateAsync({ currency: v }).then(
            () => snack('Currency updated'),
            (err: unknown) => onActionError(err),
          )
        }
        onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'timezone'}
        title="Time zone"
        options={tzOptions}
        value={me.timezone}
        onSelect={(v) =>
          void update.mutateAsync({ timezone: v }).then(
            () => snack('Time zone updated'),
            (err: unknown) => onActionError(err),
          )
        }
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}
