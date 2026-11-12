import { router } from 'expo-router';
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoMark } from '@/components/brand';
import { Button, Text } from '@/components/ui';
import { BudgetEditor } from '@/features/budget/budget-editor';
import { markWelcomeSeen } from '@/lib/onboarding';
import { useMe } from '@/lib/queries';

/** Shown once after sign-up: optional monthly budget. */
export default function Welcome() {
  const { data: me } = useMe();
  useEffect(() => {
    void markWelcomeSeen();
  }, []);
  const first = (me?.name ?? '').split(/\s+/)[0];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow justify-center px-6 py-8"
        >
          <LogoMark size={40} />
          <Text weight="display" className="mt-6 text-[38px] leading-[42px]">
            Welcome{first ? `, ${first}` : ''}
          </Text>
          <Text muted className="mb-8 mt-2 text-base">
            Want a monthly budget? PaiPai will show your progress and warn you at 80%. This step is
            optional and you can change it anytime.
          </Text>
          <BudgetEditor initial={null} submitLabel="Set budget" onDone={() => router.back()} />
          <View className="mt-3">
            <Button title="Skip for now" variant="ghost" size="lg" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
