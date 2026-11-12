import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { formatTime } from '@paipai/shared/date';
import { PAYMENT_METHOD_LABELS, type Category, type Transaction } from '@paipai/shared/schemas';
import { useDeleteTransaction, useRestoreTransaction } from '@/lib/queries';
import { CategoryIcon } from './category-icon';
import { Amount } from './money';
import { useSnackbar } from './snackbar';
import { useActionErrorHandler } from '@/lib/action-errors';
import { Skeleton, Text } from './ui';

export function useDeleteWithUndo() {
  const del = useDeleteTransaction();
  const restore = useRestoreTransaction();
  const snack = useSnackbar();
  const onError = useActionErrorHandler();
  /** Never throws: failures become a message. Resolves true when deleted. */
  return async (t: Transaction): Promise<boolean> => {
    try {
      await del.mutateAsync(t.id);
    } catch (err) {
      onError(err, 'Could not delete. Please try again.');
      return false;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    snack({
      message: `Deleted “${t.title}”`,
      actionLabel: 'Undo',
      durationMs: 6000,
      onAction: () =>
        void restore.mutateAsync(t.id).then(
          () => snack('Restored'),
          (err: unknown) => onError(err, 'Could not undo. Please try again.'),
        ),
    });
    return true;
  };
}

export const openEdit = (t: Transaction) =>
  router.push({ pathname: '/add-transaction', params: { id: t.id } });

/** Row: category icon, title + note/time, amount (red/green) with label. Swipe for edit/delete. */
export function TransactionRow({
  t,
  category,
  tz,
  timeLabel,
  swipeable = true,
}: {
  t: Transaction;
  category?: Category;
  tz: string;
  timeLabel?: string;
  swipeable?: boolean;
}) {
  const ref = useRef<SwipeableMethods>(null);
  const deleteWithUndo = useDeleteWithUndo();
  const subtitle = [t.note, timeLabel ?? formatTime(t.occurredAt, tz)].filter(Boolean).join(' · ');

  const row = (
    <Pressable
      onPress={() => openEdit(t)}
      accessibilityRole="button"
      accessibilityLabel={`${t.title}, ${t.type === 'expense' ? 'spent' : 'received'} ${t.amount / 100} rupees. ${subtitle}`}
      accessibilityHint="Opens the entry to edit. Swipe left for edit and delete."
      accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && void deleteWithUndo(t)}
      className="min-h-16 flex-row items-center gap-3 bg-surface px-3 py-2.5 active:bg-surface-muted"
    >
      <CategoryIcon icon={category?.icon} color={category?.color} />
      <View className="flex-1">
        <Text weight="medium" className="text-[15px]" numberOfLines={1}>
          {t.title}
        </Text>
        <Text muted className="text-[13px]" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View className="items-end">
        <Amount amount={t.amount} type={t.type} />
        <Text muted className="text-xs">
          {category?.name ?? PAYMENT_METHOD_LABELS[t.paymentMethod]}
        </Text>
      </View>
    </Pressable>
  );

  if (!swipeable) return row;

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <View className="flex-row">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${t.title}`}
            onPress={() => {
              ref.current?.close();
              openEdit(t);
            }}
            className="w-20 items-center justify-center bg-[#52525B]"
          >
            <Pencil size={20} color="#fff" />
            <Text weight="medium" className="mt-1 text-xs text-white">
              Edit
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${t.title}`}
            onPress={() => {
              ref.current?.close();
              void deleteWithUndo(t);
            }}
            className="w-20 items-center justify-center bg-expense"
          >
            <Trash2 size={20} color="#fff" />
            <Text weight="medium" className="mt-1 text-xs text-white">
              Delete
            </Text>
          </Pressable>
        </View>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

export function TransactionRowSkeleton() {
  return (
    <View className="flex-row items-center gap-3 px-3 py-3">
      <Skeleton className="h-10 w-10 rounded-[11px]" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </View>
      <Skeleton className="h-4 w-16" />
    </View>
  );
}
