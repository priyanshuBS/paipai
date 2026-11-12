import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Inbox, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/theme';
import { Text } from './ui';

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  const { colors } = useTheme();
  return (
    <View className="items-center px-4 py-10">
      <View className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-muted">
        <Icon size={20} color={colors.textSecondary} strokeWidth={1.75} />
      </View>
      <Text weight="semibold" className="mt-4 text-center text-[15px]">
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
