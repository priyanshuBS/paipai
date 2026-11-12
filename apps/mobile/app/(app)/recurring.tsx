import DateTimePicker from '@react-native-community/datetimepicker';
import { Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { DEFAULT_TIMEZONE, formatDate } from '@paipai/shared/date';
import { formatMoney, paiseToInputString, parseRupeesToPaise } from '@paipai/shared/money';
import { FREQUENCY_LABELS } from '@paipai/shared/recurrence';
import {
  PAYMENT_METHOD_LABELS,
  paymentMethods,
  recurringFrequencies,
  type PaymentMethod,
  type RecurringFrequency,
  type RecurringView,
  type TransactionType,
} from '@paipai/shared/schemas';
import { CategoryIcon } from '@/components/category-icon';
import { EmptyState } from '@/components/empty-state';
import { Sheet } from '@/components/sheet';
import { useSnackbar } from '@/components/snackbar';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  FieldError,
  Input,
  Label,
  Segmented,
  Skeleton,
  Text,
  cn,
} from '@/components/ui';
import { ApiError } from '@/lib/api';
import {
  useCategories,
  useCategoryMap,
  useMe,
  useRecurring,
  useRecurringMutations,
} from '@/lib/queries';
import { useTheme } from '@/theme/theme';
import { useActionErrorHandler } from '@/lib/action-errors';

function RecurringForm({
  editing,
  onClose,
}: {
  editing: RecurringView | null;
  onClose: () => void;
}) {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const { data: categories = [] } = useCategories();
  const m = useRecurringMutations();
  const snack = useSnackbar();
  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [amount, setAmount] = useState(editing ? paiseToInputString(editing.amount) : '');
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [method, setMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? 'upi');
  const [frequency, setFrequency] = useState<RecurringFrequency>(editing?.frequency ?? 'monthly');
  const [startAt, setStartAt] = useState(new Date(editing?.startAt ?? Date.now()));
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string>();
  const cats = categories.filter((c) => c.type === type && !c.isArchived);

  async function save() {
    const paise = parseRupeesToPaise(amount);
    if (!title.trim()) return setError('Give it a name, e.g. Rent');
    if (!paise) return setError('Enter an amount');
    const body = {
      type,
      title: title.trim(),
      amount: paise,
      categoryId,
      paymentMethod: method,
      frequency,
    };
    try {
      if (editing) await m.update.mutateAsync({ id: editing.id, body });
      else await m.create.mutateAsync({ ...body, startAt: startAt.toISOString() });
      snack(editing ? 'Recurring updated' : 'Recurring added');
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save');
    }
  }

  return (
    <Sheet
      visible
      title={editing ? 'Edit recurring' : 'New recurring'}
      onClose={onClose}
      footer={
        <Button
          title={editing ? 'Save' : 'Add recurring'}
          size="lg"
          loading={m.create.isPending || m.update.isPending}
          onPress={() => void save()}
        />
      }
    >
      <Segmented
        value={type}
        onChange={(v) => {
          setType(v);
          setCategoryId(null);
        }}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
      />
      <View>
        <Label>Name</Label>
        <Input value={title} onChangeText={setTitle} placeholder="Rent, Gym, Metro pass" />
      </View>
      <View>
        <Label>Amount (₹)</Label>
        <Input
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="12000"
        />
      </View>
      <View>
        <Label>Repeats</Label>
        <View className="flex-row flex-wrap gap-2">
          {recurringFrequencies.map((f) => (
            <Chip
              key={f}
              label={FREQUENCY_LABELS[f]}
              selected={frequency === f}
              onPress={() => setFrequency(f)}
            />
          ))}
        </View>
      </View>
      {!editing && (
        <View>
          <Label>First payment</Label>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicker(true)}
            className="h-12 justify-center rounded-xl border border-border px-4"
          >
            <Text>{formatDate(startAt, tz)}</Text>
          </Pressable>
          {picker && (
            <DateTimePicker
              value={startAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(e, d) => {
                setPicker(Platform.OS === 'ios');
                if (e.type === 'set' && d) {
                  const keep = new Date(startAt);
                  d.setHours(keep.getHours(), keep.getMinutes(), 0, 0);
                  setStartAt(d);
                }
              }}
            />
          )}
        </View>
      )}
      <View>
        <Label>Category</Label>
        <View className="flex-row flex-wrap gap-2">
          <Chip label="None" selected={categoryId === null} onPress={() => setCategoryId(null)} />
          {cats.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              left={<CategoryIcon icon={c.icon} color={c.color} size="sm" />}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </View>
      </View>
      <View>
        <Label>Paid with</Label>
        <View className="flex-row flex-wrap gap-2">
          {paymentMethods.map((p) => (
            <Chip
              key={p}
              label={PAYMENT_METHOD_LABELS[p]}
              selected={method === p}
              onPress={() => setMethod(p)}
            />
          ))}
        </View>
      </View>
      <FieldError>{error}</FieldError>
    </Sheet>
  );
}

export default function RecurringScreen() {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const { colors } = useTheme();
  const q = useRecurring();
  const m = useRecurringMutations();
  const categories = useCategoryMap();
  const snack = useSnackbar();
  const onActionError = useActionErrorHandler();
  const [form, setForm] = useState<{ open: boolean; editing: RecurringView | null }>({
    open: false,
    editing: null,
  });
  const items = q.data ?? [];

  const remove = (r: RecurringView) =>
    Alert.alert(
      'Delete recurring?',
      `Stop adding “${r.title}”? Past entries stay in your history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void m.remove.mutateAsync(r.id).then(
              () => snack('Deleted'),
              (err: unknown) => onActionError(err),
            ),
        },
      ],
    );

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-4 px-4 pb-28 pt-2">
        <Text muted className="px-1 text-sm">
          Rent, subscriptions or salary are added automatically when they&apos;re due.
        </Text>
        {q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} />
        ) : q.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No recurring transactions"
            description="Add rent or a metro pass once and PaiPai logs it for you."
          />
        ) : (
          <Card className="px-0 py-1">
            {items.map((r, i) => {
              const cat = r.categoryId ? categories.get(r.categoryId) : undefined;
              return (
                <View
                  key={r.id}
                  className={cn(
                    'flex-row items-center gap-2 px-3 py-3',
                    i > 0 && 'border-t border-border',
                    !r.isActive && 'opacity-60',
                  )}
                >
                  <CategoryIcon icon={cat?.icon ?? 'repeat'} color={cat?.color} size="sm" />
                  <View className="flex-1">
                    <Text weight="semibold" numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text muted className="text-xs" numberOfLines={1}>
                      {FREQUENCY_LABELS[r.frequency]} ·{' '}
                      {r.isActive ? `next ${formatDate(r.nextRunAt, tz)}` : 'paused'}
                    </Text>
                    <Text
                      weight="semibold"
                      className={cn(
                        'text-sm',
                        r.type === 'expense' ? 'text-foreground' : 'text-income',
                      )}
                    >
                      {r.type === 'expense' ? '−' : '+'}
                      {formatMoney(r.amount)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={r.isActive ? `Pause ${r.title}` : `Resume ${r.title}`}
                    onPress={() =>
                      void m.update
                        .mutateAsync({ id: r.id, body: { isActive: !r.isActive } })
                        .catch((err: unknown) => onActionError(err))
                    }
                    className="h-11 w-11 items-center justify-center"
                  >
                    {r.isActive ? (
                      <Pause size={18} color={colors.text} />
                    ) : (
                      <Play size={18} color={colors.text} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${r.title}`}
                    onPress={() => setForm({ open: true, editing: r })}
                    className="h-11 w-11 items-center justify-center"
                  >
                    <Pencil size={18} color={colors.text} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${r.title}`}
                    onPress={() => remove(r)}
                    className="h-11 w-11 items-center justify-center"
                  >
                    <Trash2 size={18} color={colors.expense} />
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
      <View className="absolute bottom-8 left-4 right-4">
        <Button
          title="New recurring"
          size="lg"
          icon={<Plus size={18} color="#fff" />}
          onPress={() => setForm({ open: true, editing: null })}
        />
      </View>
      {form.open && (
        <RecurringForm
          editing={form.editing}
          onClose={() => setForm({ open: false, editing: null })}
        />
      )}
    </View>
  );
}
