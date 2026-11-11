import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DEFAULT_REMINDER_TIME } from '@paipai/shared/settings';
import { api } from './api';

const REMINDER_KEY = 'paipai:reminder';
const PUSH_TOKEN_KEY = 'paipai:push-token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export interface ReminderSettings {
  enabled: boolean;
  /** "HH:mm", device local time */
  time: string;
  notificationId?: string;
}

export async function getReminder(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_KEY);
    if (raw) return JSON.parse(raw) as ReminderSettings;
  } catch {
    /* ignore */
  }
  return { enabled: false, time: DEFAULT_REMINDER_TIME };
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders & alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#B6E36B',
    });
  }
}

export async function ensurePermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Schedule (or cancel) the daily "Did you add today's expenses?" reminder. */
export async function setReminder(enabled: boolean, time: string): Promise<ReminderSettings> {
  const prev = await getReminder();
  if (prev.notificationId)
    await Notifications.cancelScheduledNotificationAsync(prev.notificationId).catch(
      () => undefined,
    );
  let next: ReminderSettings = { enabled: false, time };
  if (enabled) {
    if (!(await ensurePermission()))
      throw new Error('Notifications are turned off for PaiPai in system settings.');
    const [h, m] = time.split(':').map(Number);
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Did you add today's expenses?",
        body: 'It takes 5 seconds. Tap to add.',
        data: { type: 'reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h ?? 21,
        minute: m ?? 0,
        channelId: 'default',
      },
    });
    next = { enabled: true, time, notificationId };
  }
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(next));
  return next;
}

/**
 * Register this device for budget-alert pushes. Remote push needs a
 * development/production build (not Expo Go on Android) and an EAS project id;
 * otherwise we quietly skip — in-app alerts still work.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    if (
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
      Platform.OS === 'android'
    )
      return;
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
        ?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch {
    /* push is best-effort */
  }
}

/** Remove this device's push token (on sign-out). */
export async function unregisterPush(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
  if (!token) return;
  await api.removePushToken(token).catch(() => undefined);
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => undefined);
}
