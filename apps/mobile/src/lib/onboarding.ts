import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'paipai:onboarded';

export async function markOnboarded() {
  await AsyncStorage.setItem(KEY, '1').catch(() => undefined);
}

/** null while loading, then whether the intro slides were already seen. */
export function useOnboarded(): boolean | null {
  const [v, setV] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((x) => setV(x === '1'))
      .catch(() => setV(false));
  }, []);
  return v;
}

const WELCOME_KEY = 'paipai:welcome-seen';

export async function markWelcomeSeen() {
  await AsyncStorage.setItem(WELCOME_KEY, '1').catch(() => undefined);
}

export async function shouldShowWelcome(me: { createdAt: string; monthlyBudget: number | null }) {
  if (me.monthlyBudget !== null) return false;
  const isNew = Date.now() - new Date(me.createdAt).getTime() < 15 * 60 * 1000;
  if (!isNew) return false;
  return (await AsyncStorage.getItem(WELCOME_KEY).catch(() => '1')) !== '1';
}
