import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, ChevronDown, Copy, Trash2, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_TIMEZONE,
  dayKey,
  formatDate,
  formatTime,
  sameTimeYesterday,
} from '@paipai/shared/date';
import { formatMoney, paiseToInputString, parseRupeesToPaise } from '@paipai/shared/money';
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type TitleSuggestion,
  type Transaction,
  type TransactionType,
} from '@paipai/shared/schemas';
import { palette } from '@paipai/shared/tokens';
import { CategoryIcon } from '@/components/category-icon';
import { useSnackbar } from '@/components/snackbar';
import { useDeleteWithUndo } from '@/components/transaction-row';
import {
  Button,
  Chip,
  FieldError,
  Input,
  Label,
  Segmented,
  Skeleton,
  Text,
  cn,
} from '@/components/ui';
import { api, ApiError, type TransactionPage } from '@/lib/api';
import { enqueueTransaction, isOfflineError } from '@/lib/offline-queue';
import { ReceiptPicker } from '@/features/receipts/receipt-picker';
import { useCategories, useDuplicateTransaction, useMe, useSaveTransaction } from '@/lib/queries';
import { useTheme } from '@/theme/theme';

const METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank', 'other'];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** A date `offset` days from today, keeping the time of `keep` (or "now" when `useNow`). */
function onDay(offset: number, keep: Date, useNow: boolean): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  if (!useNow) d.setHours(keep.getHours(), keep.getMinutes(), 0, 0);
  return d;
}

/** Find a transaction already in the cache (instant edit), else fetch it. */
function useTransactionForEdit(id?: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['transaction', id],
    enabled: !!id,
    queryFn: () => api.transaction(id as string),
    initialData: () => {
      for (const [, data] of qc.getQueriesData<TransactionPage | { pages: TransactionPage[] }>({
        queryKey: ['transactions'],
      })) {
        const pages = data && 'pages' in data ? data.pages : data ? [data] : [];
        for (const p of pages) {
          const hit = p.items.find((t) => t.id === id);
          if (hit) return hit;
        }
      }
      return undefined;
    },
  });
}

export default function AddTransactionScreen() {
  const params = useLocalSearchParams<{ id?: string; type?: TransactionType }>();
  const editing = useTransactionForEdit(params.id);
  if (params.id && !editing.data) {
    return (
      <SafeAreaView className="flex-1 bg-surface p-5">
        {editing.isError ? (
          <Text>Could not load this entry.</Text>
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </SafeAreaView>
    );
  }
  return (
    <QuickAddForm
      editing={editing.data ?? null}
      initialType={params.type === 'income' ? 'income' : 'expense'}
    />
  );
}

function QuickAddForm({
  editing,
  initialType,
}: {
  editing: Transaction | null;
  initialType: TransactionType;
}) {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const { colors } = useTheme();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const save = useSaveTransaction();
  const duplicate = useDuplicateTransaction();
  const deleteWithUndo = useDeleteWithUndo();
  const snack = useSnackbar();

  const [type, setType] = useState<TransactionType>(editing?.type ?? initialType);
  const [amount, setAmount] = useState(editing ? paiseToInputString(editing.amount) : '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [method, setMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? 'upi');
  const [when, setWhen] = useState<Date>(editing ? new Date(editing.occurredAt) : new Date());
  const [picker, setPicker] = useState<null | 'date' | 'time'>(null);
  const [tags, setTags] = useState((editing?.tags ?? []).join(', '));
  const [showMore, setShowMore] = useState(Boolean(editing?.tags.length || editing?.receiptUrl));
  const [receiptUrl, setReceiptUrl] = useState<string | null>(editing?.receiptUrl ?? null);
  const [titleFocused, setTitleFocused] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; title?: string; form?: string }>({});
  const categoryTouched = useRef(Boolean(editing?.categoryId));
  const titleRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const q = useDebounced(title.trim(), 150);
  const { data: suggestions = [] } = useQuery({
    queryKey: ['titles', q],
    queryFn: ({ signal }) => api.titles(q, signal),
    enabled: titleFocused && q.length >= 1,
    staleTime: 60_000,
  });
  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter((s) => s.title.toLowerCase() !== title.trim().toLowerCase()).slice(0, 5),
    [suggestions, title],
  );
  const typeCategories = useMemo(
    () => (categories ?? []).filter((c) => c.type === type && !c.isArchived),
    [categories, type],
  );

  useEffect(() => {
    if (categoryId && categories && !typeCategories.some((c) => c.id === categoryId))
      setCategoryId(null);
  }, [type, typeCategories, categoryId, categories]);

  function applySuggestion(s: TitleSuggestion) {
    setTitle(s.title);
    setTitleFocused(false);
    titleRef.current?.blur();
    if (
      !categoryTouched.current &&
      s.categoryId &&
      typeCategories.some((c) => c.id === s.categoryId)
    )
      setCategoryId(s.categoryId);
    setMethod(s.paymentMethod);
    void Haptics.selectionAsync();
  }

  const todayKey = dayKey(new Date(), tz);
  const yesterdayKey = dayKey(sameTimeYesterday(tz), tz);
  const selectedKey = dayKey(when, tz);

  const onPick = (e: DateTimePickerEvent, d?: Date) => {
    const mode = picker;
    if (Platform.OS === 'android') setPicker(null);
    if (e.type !== 'set' || !d) return;
    setWhen(d);
    // Android shows date then time as two dialogs
    if (Platform.OS === 'android' && mode === 'date') setTimeout(() => setPicker('time'), 50);
  };

  async function onSave() {
    const paise = parseRupeesToPaise(amount);
    const next: typeof errors = {};
    if (paise === null || paise <= 0) next.amount = 'Enter an amount, e.g. 30 or 30.50';
    if (!title.trim())
      next.title = type === 'expense' ? 'What did you spend on?' : 'Where did it come from?';
    setErrors(next);
    if (Object.keys(next).length || paise === null) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const payload = {
      type,
      amount: paise,
      title: title.trim(),
      note: note.trim() || null,
      categoryId,
      paymentMethod: method,
      occurredAt: when.toISOString(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
      receiptUrl,
    };
    // Client-generated id: lets an offline-queued create be replayed safely.
    const createPayload = { ...payload, id: Crypto.randomUUID() };
    try {
      const saved = editing
        ? await save.mutateAsync({ id: editing.id, update: payload })
        : await save.mutateAsync({ create: createPayload });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const alert = saved.budgetAlerts?.at(-1);
      snack(
        alert
          ? {
              message: `⚠️ ${alert.message}`,
              tone: alert.level === 'over' ? 'error' : 'default',
              durationMs: 7000,
            }
          : editing
            ? 'Saved changes'
            : `${type === 'expense' ? 'Expense' : 'Income'} of ${formatMoney(paise)} added`,
      );
      router.back();
    } catch (err) {
      if (!editing && isOfflineError(err)) {
        await enqueueTransaction(createPayload);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        snack('Saved offline. It will sync when you are back online.');
        router.back();
        return;
      }
      setErrors({
        form: err instanceof ApiError ? err.message : 'Could not save. Please try again.',
      });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-4 pb-1 pt-2">
          <Text weight="bold" className="text-lg">
            {editing ? `Edit ${editing.type}` : 'Quick add'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center"
          >
            <X size={22} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-4 pb-6">
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
          />

          {/* Amount */}
          <View>
            <View
              className={cn(
                'flex-row items-center gap-2 rounded-card px-5 py-3',
                type === 'expense' ? 'bg-accent-soft dark:bg-surface-muted' : 'bg-income/10',
                errors.amount && 'border-2 border-expense',
              )}
            >
              <Text weight="semibold" muted className="text-3xl">
                ₹
              </Text>
              <TextInput
                autoFocus={!editing}
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^\d.,]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Amount in rupees"
                returnKeyType="next"
                onSubmitEditing={() => titleRef.current?.focus()}
                className="flex-1 py-1 font-inter-semibold text-[40px] text-foreground"
                style={{ fontVariant: ['tabular-nums'] }}
              />
            </View>
            <FieldError>{errors.amount}</FieldError>
          </View>

          {/* Title + autocomplete */}
          <View>
            <Label>{type === 'expense' ? 'What for?' : 'From'}</Label>
            <Input
              ref={titleRef}
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                setTitleFocused(true);
              }}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTimeout(() => setTitleFocused(false), 150)}
              placeholder={type === 'expense' ? 'Auto fare, Milk, Rent…' : 'Salary, Freelance…'}
              maxLength={80}
              autoCapitalize="sentences"
              returnKeyType="done"
              invalid={!!errors.title}
              accessibilityLabel={type === 'expense' ? 'What for' : 'Income source'}
            />
            <FieldError>{errors.title}</FieldError>
            {titleFocused && visibleSuggestions.length > 0 && (
              <View className="mt-1 overflow-hidden rounded-2xl border border-border bg-surface">
                {visibleSuggestions.map((s) => {
                  const cat = categories?.find((c) => c.id === s.categoryId);
                  return (
                    <Pressable
                      key={s.title}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${s.title}, last ${formatMoney(s.lastAmount)}`}
                      onPress={() => applySuggestion(s)}
                      className="min-h-12 flex-row items-center gap-3 px-3 py-2 active:bg-surface-muted"
                    >
                      <CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" />
                      <Text weight="medium" className="flex-1" numberOfLines={1}>
                        {s.title}
                      </Text>
                      <Text muted className="text-xs">
                        {formatMoney(s.lastAmount)} · {s.count}×
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View>
            <Label>
              Note <Text muted>(optional)</Text>
            </Label>
            <Input
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Motihari to Khartari"
              maxLength={280}
              accessibilityLabel="Note"
            />
          </View>

          {/* Category grid */}
          <View>
            <Label>Category</Label>
            <View className="flex-row flex-wrap">
              {catsLoading
                ? Array.from({ length: 8 }, (_, i) => (
                    <View key={i} className="w-1/4 p-1">
                      <Skeleton className="h-20 w-full rounded-2xl" />
                    </View>
                  ))
                : typeCategories.map((c) => {
                    const selected = c.id === categoryId;
                    return (
                      <View key={c.id} className="w-1/4 p-1">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={c.name}
                          accessibilityState={{ selected }}
                          onPress={() => {
                            categoryTouched.current = true;
                            void Haptics.selectionAsync();
                            setCategoryId(selected ? null : c.id);
                          }}
                          className={cn(
                            'min-h-20 items-center justify-center gap-1.5 rounded-2xl px-1 py-2',
                            selected
                              ? 'border-2 border-forest bg-accent-soft dark:border-lime dark:bg-surface-muted'
                              : 'border-2 border-transparent',
                          )}
                        >
                          <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                          <Text
                            weight="medium"
                            className="text-center text-[11px] leading-tight"
                            numberOfLines={2}
                          >
                            {c.name}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
            </View>
          </View>

          {/* Payment method */}
          <View>
            <Label>Paid with</Label>
            <View className="flex-row flex-wrap gap-2">
              {METHODS.map((m) => (
                <Chip
                  key={m}
                  label={PAYMENT_METHOD_LABELS[m]}
                  selected={method === m}
                  onPress={() => setMethod(m)}
                />
              ))}
            </View>
          </View>

          {/* Date & time */}
          <View>
            <Label>When</Label>
            <View className="flex-row flex-wrap items-center gap-2">
              <Chip
                label="Today"
                selected={selectedKey === todayKey}
                onPress={() => setWhen(onDay(0, when, !editing))}
              />
              <Chip
                label="Yesterday"
                selected={selectedKey === yesterdayKey}
                onPress={() => setWhen(onDay(-1, when, false))}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Pick date and time, currently ${formatDate(when, tz)} ${formatTime(when, tz)}`}
                onPress={() => setPicker('date')}
                className="h-11 flex-row items-center gap-2 rounded-full border border-border bg-surface px-4"
              >
                <CalendarClock size={16} color={colors.text} />
                <Text weight="medium" className="text-sm">
                  {formatDate(when, tz)}, {formatTime(when, tz)}
                </Text>
              </Pressable>
            </View>
            {picker && (
              <DateTimePicker
                value={when}
                mode={Platform.OS === 'ios' ? 'datetime' : picker}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date(Date.now() + 86_400_000)}
                onChange={onPick}
                accentColor={palette.forestMid}
              />
            )}
            {picker && Platform.OS === 'ios' && (
              <Button
                title="Done"
                variant="soft"
                className="mt-2"
                onPress={() => setPicker(null)}
              />
            )}
          </View>

          <View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowMore((v) => !v)}
              className="h-11 flex-row items-center gap-1"
            >
              <Text muted weight="medium" className="text-sm">
                More details
              </Text>
              <ChevronDown
                size={16}
                color={colors.textSecondary}
                style={{ transform: [{ rotate: showMore ? '180deg' : '0deg' }] }}
              />
            </Pressable>
            {showMore && (
              <View>
                <Label>Tags</Label>
                <Input
                  value={tags}
                  onChangeText={setTags}
                  placeholder="trip, office"
                  autoCapitalize="none"
                  accessibilityLabel="Tags"
                />
                <ReceiptPicker value={receiptUrl} onChange={setReceiptUrl} />
              </View>
            )}
          </View>

          {errors.form && (
            <View className="rounded-2xl bg-expense/10 p-3">
              <Text className="text-sm text-expense">{errors.form}</Text>
            </View>
          )}
        </ScrollView>

        <View className="flex-row gap-2 border-t border-border bg-surface px-4 pt-3">
          {editing && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Duplicate"
                onPress={() =>
                  void duplicate.mutateAsync(editing.id).then(() => {
                    snack('Duplicated as a new entry for now');
                    router.back();
                  })
                }
                className="h-14 w-14 items-center justify-center rounded-full border border-border"
              >
                <Copy size={20} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete"
                onPress={() => void deleteWithUndo(editing).then(() => router.back())}
                className="h-14 w-14 items-center justify-center rounded-full border border-border"
              >
                <Trash2 size={20} color={colors.expense} />
              </Pressable>
            </>
          )}
          <Button
            title={editing ? 'Save changes' : type === 'expense' ? 'Save expense' : 'Save income'}
            size="lg"
            className="flex-1"
            loading={save.isPending}
            onPress={() => void onSave()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
