'use client';

import { useQuery } from '@tanstack/react-query';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { ChevronDown, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_TIMEZONE,
  fromDateTimeLocalValue,
  sameTimeYesterday,
  toDateTimeLocalValue,
  dayKey,
} from '@paipai/shared/date';
import { paiseToInputString, parseRupeesToPaise, formatMoney } from '@paipai/shared/money';
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type TitleSuggestion,
  type Transaction,
  type TransactionType,
} from '@paipai/shared/schemas';
import { RECEIPT_MAX_BYTES } from '@paipai/shared/settings';
import { CategoryIcon } from '@/components/category-icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Chip, FieldError, Input, Label, Segmented } from '@/components/ui/primitives';
import { api, ApiError } from '@/lib/api';
import {
  uploadImage,
  useUploadsEnabled,
  useCategories,
  useDeleteTransaction,
  useDuplicateTransaction,
  useMe,
  useRestoreTransaction,
  useSaveTransaction,
} from '@/lib/queries';
import { useActionErrorHandler } from '@/lib/action-errors';
import { cn } from '@/lib/utils';

const METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank', 'other'];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType: TransactionType;
  editing: Transaction | null;
}

export function QuickAddDialog({ open, onOpenChange, initialType, editing }: Props) {
  // Remount the form on every open so it starts fresh.
  const [session, setSession] = useState(0);
  useEffect(() => {
    if (open) setSession((s) => s + 1);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent
          title={editing ? `Edit ${editing.type}` : 'Quick add'}
          description="Add an expense or income with amount, item, category, payment method and time."
        >
          <QuickAddForm
            key={session}
            initialType={initialType}
            editing={editing}
            onDone={() => onOpenChange(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

/** Undo toast for deletions (shared with the transactions list). */
export function useDeleteWithUndo() {
  const del = useDeleteTransaction();
  const restore = useRestoreTransaction();
  const onError = useActionErrorHandler();
  /** Never throws: failures become a toast. Resolves true when deleted. */
  return async (t: Transaction): Promise<boolean> => {
    try {
      await del.mutateAsync(t.id);
    } catch (err) {
      onError(err, 'Could not delete. Please try again.');
      return false;
    }
    toast(`Deleted “${t.title}”`, {
      action: {
        label: 'Undo',
        onClick: () => {
          void restore.mutateAsync(t.id).then(
            () => toast.success('Restored'),
            (err: unknown) => onError(err, 'Could not undo. Please try again.'),
          );
        },
      },
      duration: 6000,
    });
    return true;
  };
}

function QuickAddForm({
  initialType,
  editing,
  onDone,
}: {
  initialType: TransactionType;
  editing: Transaction | null;
  onDone: () => void;
}) {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const { data: categories, isLoading: catsLoading } = useCategories();
  const save = useSaveTransaction();
  const duplicate = useDuplicateTransaction();
  const deleteWithUndo = useDeleteWithUndo();
  const onActionError = useActionErrorHandler();

  const [type, setType] = useState<TransactionType>(editing?.type ?? initialType);
  const [amount, setAmount] = useState(editing ? paiseToInputString(editing.amount) : '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [method, setMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? 'upi');
  const [when, setWhen] = useState(() =>
    toDateTimeLocalValue(editing?.occurredAt ?? new Date(), tz),
  );
  const [tags, setTags] = useState((editing?.tags ?? []).join(', '));
  const [location, setLocation] = useState(editing?.location ?? '');
  const [showMore, setShowMore] = useState(
    Boolean(editing?.tags.length || editing?.location || editing?.receiptUrl),
  );
  const uploadsEnabled = useUploadsEnabled();
  const [receiptUrl, setReceiptUrl] = useState<string | null>(editing?.receiptUrl ?? null);
  const [uploading, setUploading] = useState(false);

  async function onReceipt(file: File | undefined) {
    if (!file) return;
    if (file.size > RECEIPT_MAX_BYTES) {
      toast.error('Receipt must be under 5 MB');
      return;
    }
    setUploading(true);
    try {
      setReceiptUrl(await uploadImage(file, 'receipt'));
    } catch {
      toast.error('Could not upload the receipt');
    } finally {
      setUploading(false);
    }
  }
  const [errors, setErrors] = useState<{ amount?: string; title?: string; form?: string }>({});

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const categoryTouched = useRef(Boolean(editing?.categoryId));
  const listId = useId();

  const debouncedTitle = useDebounced(title.trim(), 150);
  const { data: suggestions = [] } = useQuery({
    queryKey: ['titles', debouncedTitle],
    queryFn: ({ signal }) => api.titles(debouncedTitle, signal),
    enabled: suggestOpen && debouncedTitle.length >= 1,
    staleTime: 60_000,
  });
  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter((s) => s.title.toLowerCase() !== title.trim().toLowerCase()).slice(0, 6),
    [suggestions, title],
  );

  const typeCategories = useMemo(
    () => (categories ?? []).filter((c) => c.type === type && !c.isArchived),
    [categories, type],
  );

  // Switching type clears a category of the other type.
  useEffect(() => {
    if (categoryId && categories && !typeCategories.some((c) => c.id === categoryId))
      setCategoryId(null);
  }, [type, typeCategories, categoryId, categories]);

  function applySuggestion(s: TitleSuggestion) {
    setTitle(s.title);
    setSuggestOpen(false);
    setActiveIdx(-1);
    // Fill in the last-used category & method unless the user already chose one.
    if (
      !categoryTouched.current &&
      s.categoryId &&
      (categories ?? []).some((c) => c.id === s.categoryId && c.type === type)
    ) {
      setCategoryId(s.categoryId);
    }
    setMethod(s.paymentMethod);
  }

  function onTitleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!suggestOpen || visibleSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % visibleSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? visibleSuggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      const s = visibleSuggestions[activeIdx];
      if (s) applySuggestion(s);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setSuggestOpen(false);
    }
  }

  const todayKey = dayKey(new Date(), tz);
  const yesterdayKey = dayKey(sameTimeYesterday(tz), tz);
  const selectedDay = when.slice(0, 10);

  function setDay(target: 'today' | 'yesterday') {
    const time = when.slice(11) || toDateTimeLocalValue(new Date(), tz).slice(11);
    const base =
      target === 'today'
        ? toDateTimeLocalValue(new Date(), tz)
        : toDateTimeLocalValue(sameTimeYesterday(tz), tz);
    setWhen(`${base.slice(0, 10)}T${target === 'today' && !editing ? base.slice(11) : time}`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const paise = parseRupeesToPaise(amount);
    const nextErrors: typeof errors = {};
    if (paise === null || paise <= 0) nextErrors.amount = 'Enter an amount, e.g. 30 or 30.50';
    if (!title.trim())
      nextErrors.title = type === 'expense' ? 'What did you spend on?' : 'Where did it come from?';
    const occurred = fromDateTimeLocalValue(when, tz);
    if (!occurred) nextErrors.form = 'Pick a valid date and time';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || paise === null || !occurred) return;

    const payload = {
      type,
      amount: paise,
      title: title.trim(),
      note: note.trim() || null,
      categoryId,
      paymentMethod: method,
      occurredAt: occurred.toISOString(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
      location: location.trim() || null,
      receiptUrl,
    };

    try {
      const saved = editing
        ? await save.mutateAsync({ id: editing.id, update: payload })
        : await save.mutateAsync({ create: payload });
      toast.success(
        editing
          ? 'Saved changes'
          : `${type === 'expense' ? 'Expense' : 'Income'} of ${formatMoney(paise)} added`,
      );
      // In-app budget warnings (threshold / over 100%)
      for (const a of saved.budgetAlerts ?? []) {
        if (a.level === 'over') toast.error(a.message, { duration: 8000 });
        else toast.warning(a.message, { duration: 8000 });
      }
      onDone();
    } catch (err) {
      setErrors({
        form: err instanceof ApiError ? err.message : 'Could not save. Please try again.',
      });
    }
  }

  const amountId = useId();

  return (
    <form onSubmit={onSubmit} className="space-y-5 pt-1" noValidate>
      <Segmented
        label="Transaction type"
        value={type}
        onChange={setType}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
        className="w-full [&>button]:flex-1"
      />

      {/* Amount */}
      <div>
        <label htmlFor={amountId} className="sr-only">
          Amount in rupees
        </label>
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border border-border-strong px-4 py-3 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20',
            errors.amount && 'border-expense ring-2 ring-expense/20',
          )}
        >
          <span className="text-2xl font-medium text-muted-foreground" aria-hidden>
            ₹
          </span>
          <input
            id={amountId}
            autoFocus
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            aria-invalid={!!errors.amount || undefined}
            aria-describedby={errors.amount ? `${amountId}-err` : undefined}
            className="w-full min-w-0 bg-transparent text-[34px] font-semibold leading-none tracking-tight tabular-nums text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </div>
        <FieldError id={`${amountId}-err`}>{errors.amount}</FieldError>
      </div>

      {/* Title with autocomplete */}
      <div className="relative">
        <Label htmlFor="qa-title">{type === 'expense' ? 'What for?' : 'From'}</Label>
        <Input
          id="qa-title"
          role="combobox"
          aria-expanded={suggestOpen && visibleSuggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
          autoComplete="off"
          placeholder={type === 'expense' ? 'Auto fare, Milk, Rent…' : 'Salary, Freelance…'}
          value={title}
          maxLength={80}
          onChange={(e) => {
            setTitle(e.target.value);
            setSuggestOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setSuggestOpen(true)}
          onBlur={() => setTimeout(() => setSuggestOpen(false), 120)}
          onKeyDown={onTitleKey}
          aria-invalid={!!errors.title || undefined}
        />
        <FieldError>{errors.title}</FieldError>
        {suggestOpen && visibleSuggestions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg bg-surface p-1 shadow-[var(--shadow-pop)] ring-1 ring-border"
          >
            {visibleSuggestions.map((s, i) => {
              const cat = categories?.find((c) => c.id === s.categoryId);
              return (
                <li
                  key={s.title}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySuggestion(s);
                  }}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2',
                    i === activeIdx ? 'bg-surface-muted' : 'hover:bg-surface-muted',
                  )}
                >
                  <CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium">{s.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatMoney(s.lastAmount)} · {s.count}×
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <Label htmlFor="qa-note">
          Note <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="qa-note"
          placeholder="e.g. Motihari to Khartari"
          value={note}
          maxLength={280}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Category grid */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Category</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {catsLoading
            ? Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="h-[76px] animate-pulse rounded-lg bg-surface-muted" />
              ))
            : typeCategories.map((c) => {
                const selected = c.id === categoryId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      categoryTouched.current = true;
                      setCategoryId(selected ? null : c.id);
                    }}
                    className={cn(
                      'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-lg p-2 text-center transition',
                      selected ? 'bg-accent-soft ring-1 ring-accent' : 'hover:bg-surface-muted',
                    )}
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight">
                      {c.name}
                    </span>
                  </button>
                );
              })}
        </div>
      </fieldset>

      {/* Payment method */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Paid with</legend>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <Chip key={m} selected={method === m} onClick={() => setMethod(m)}>
              {PAYMENT_METHOD_LABELS[m]}
            </Chip>
          ))}
        </div>
      </fieldset>

      {/* Date & time */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">When</legend>
        <div className="flex flex-wrap items-center gap-2">
          <Chip selected={selectedDay === todayKey} onClick={() => setDay('today')}>
            Today
          </Chip>
          <Chip selected={selectedDay === yesterdayKey} onClick={() => setDay('yesterday')}>
            Yesterday
          </Chip>
          <label className="sr-only" htmlFor="qa-when">
            Date and time
          </label>
          <input
            id="qa-when"
            type="datetime-local"
            value={when}
            max={toDateTimeLocalValue(new Date(Date.now() + 86_400_000), tz)}
            onChange={(e) => setWhen(e.target.value)}
            className="h-9 rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </fieldset>

      <div>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          More details{' '}
          <ChevronDown className={cn('size-4 transition', showMore && 'rotate-180')} aria-hidden />
        </button>
        {showMore && (
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="qa-tags">Tags</Label>
              <Input
                id="qa-tags"
                placeholder="trip, office"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="qa-location">Location</Label>
              <Input
                id="qa-location"
                placeholder="Patna"
                value={location}
                maxLength={120}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            {uploadsEnabled && (
              <div className="sm:col-span-2">
                <Label htmlFor="qa-receipt">Receipt photo</Label>
                {receiptUrl ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptUrl}
                      alt="Receipt"
                      className="size-16 rounded-xl object-cover"
                    />
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium underline"
                    >
                      View
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReceiptUrl(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="qa-receipt"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    disabled={uploading}
                    onChange={(e) => void onReceipt(e.target.files?.[0])}
                    className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
                  />
                )}
                {uploading && <p className="mt-1 text-sm text-muted-foreground">Uploading…</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {errors.form && (
        <p role="alert" className="rounded-lg bg-expense/10 p-3 text-sm text-expense">
          {errors.form}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {editing && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Duplicate"
              onClick={() =>
                void duplicate.mutateAsync(editing.id).then(
                  () => {
                    toast.success('Duplicated as a new entry for now');
                    onDone();
                  },
                  (err: unknown) => onActionError(err, 'Could not duplicate. Please try again.'),
                )
              }
            >
              <Copy />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Delete"
              className="text-expense"
              onClick={() => void deleteWithUndo(editing).then((ok) => ok && onDone())}
            >
              <Trash2 />
            </Button>
          </>
        )}
        <Button type="submit" size="lg" className="flex-1" loading={save.isPending}>
          {editing ? 'Save changes' : type === 'expense' ? 'Save expense' : 'Save income'}
        </Button>
      </div>
    </form>
  );
}
