'use client';

import { Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  DEFAULT_TIMEZONE,
  formatDate,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '@paipai/shared/date';
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
import { PageHeader } from '@/components/app/app-shell';
import { CategoryIcon } from '@/components/category-icon';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Card,
  Chip,
  ErrorState,
  FieldError,
  Input,
  Label,
  Segmented,
  Select,
  Skeleton,
} from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import {
  useCategories,
  useCategoryMap,
  useMe,
  useRecurring,
  useRecurringMutations,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

function RecurringDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: RecurringView | null;
}) {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const { data: categories = [] } = useCategories();
  const m = useRecurringMutations();
  const [type, setType] = useState<TransactionType>(editing?.type ?? 'expense');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [amount, setAmount] = useState(editing ? paiseToInputString(editing.amount) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [method, setMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? 'upi');
  const [frequency, setFrequency] = useState<RecurringFrequency>(editing?.frequency ?? 'monthly');
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(editing?.startAt ?? new Date(), tz));
  const [endAt, setEndAt] = useState(editing?.endAt ? toDateTimeLocalValue(editing.endAt, tz) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState<string>();
  const cats = categories.filter((c) => c.type === type && !c.isArchived);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const paise = parseRupeesToPaise(amount);
    const start = fromDateTimeLocalValue(startAt, tz);
    const end = endAt ? fromDateTimeLocalValue(endAt, tz) : null;
    if (!title.trim()) return setError('Give it a name, e.g. Rent');
    if (!paise) return setError('Enter an amount');
    if (!start) return setError('Pick a start date');
    const common = {
      type,
      title: title.trim(),
      amount: paise,
      categoryId: categoryId || null,
      paymentMethod: method,
      frequency,
      note: note.trim() || null,
      endAt: end ? end.toISOString() : null,
    };
    try {
      if (editing) await m.update.mutateAsync({ id: editing.id, body: common });
      else await m.create.mutateAsync({ ...common, startAt: start.toISOString() });
      toast.success(editing ? 'Recurring transaction updated' : 'Recurring transaction added');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent title={editing ? 'Edit recurring' : 'New recurring transaction'}>
          <form onSubmit={submit} className="space-y-4 pb-2" noValidate>
            <Segmented
              label="Type"
              value={type}
              onChange={(v) => {
                setType(v);
                setCategoryId('');
              }}
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
              className="w-full [&>button]:flex-1"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-title">Name</Label>
                <Input
                  id="r-title"
                  autoFocus
                  placeholder="Rent, Gym, Metro pass"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="r-amount">Amount (₹)</Label>
                <Input
                  id="r-amount"
                  inputMode="decimal"
                  placeholder="12000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-freq">Repeats</Label>
                <Select
                  id="r-freq"
                  className="h-12 w-full rounded-2xl"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                >
                  {recurringFrequencies.map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="r-cat">Category</Label>
                <Select
                  id="r-cat"
                  className="h-12 w-full rounded-2xl"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">None</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Paid with</legend>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((p) => (
                  <Chip key={p} selected={method === p} onClick={() => setMethod(p)}>
                    {PAYMENT_METHOD_LABELS[p]}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-start">{editing ? 'Started' : 'First payment'}</Label>
                <Input
                  id="r-start"
                  type="datetime-local"
                  value={startAt}
                  disabled={!!editing}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="r-end">
                  Ends <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="r-end"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="r-note">
                Note <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="r-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <FieldError>{error}</FieldError>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={m.create.isPending || m.update.isPending}
            >
              {editing ? 'Save' : 'Add recurring'}
            </Button>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default function RecurringPage() {
  const { data: me } = useMe();
  const tz = me?.timezone ?? DEFAULT_TIMEZONE;
  const q = useRecurring();
  const m = useRecurringMutations();
  const categories = useCategoryMap();
  const [dialog, setDialog] = useState<{ open: boolean; editing: RecurringView | null }>({
    open: false,
    editing: null,
  });
  const items = q.data ?? [];
  const monthlyCost = items
    .filter((r) => r.isActive && r.type === 'expense')
    .reduce(
      (s, r) =>
        s + r.amount * ({ daily: 30, weekly: 4.33, monthly: 1, yearly: 1 / 12 }[r.frequency] ?? 1),
      0,
    );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Recurring"
        subtitle={
          items.length
            ? `About ${formatMoney(Math.round(monthlyCost))} a month in recurring expenses`
            : 'Rent, gym, metro pass: added automatically on schedule.'
        }
        action={
          <Button onClick={() => setDialog({ open: true, editing: null })}>
            <Plus /> New
          </Button>
        }
      />
      <div className="px-4 pt-4 sm:px-8">
        {q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} />
        ) : q.isLoading ? (
          <Skeleton className="h-64" />
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              title="No recurring transactions"
              description="Add rent, subscriptions or your salary once and PaiPai will log them for you."
              action={
                <Button onClick={() => setDialog({ open: true, editing: null })}>
                  <Repeat /> Add recurring
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="p-2">
            <ul className="divide-y divide-border">
              {items.map((r) => {
                const cat = r.categoryId ? categories.get(r.categoryId) : undefined;
                return (
                  <li
                    key={r.id}
                    className={cn('flex items-center gap-3 px-3 py-3', !r.isActive && 'opacity-60')}
                  >
                    <CategoryIcon icon={cat?.icon ?? 'repeat'} color={cat?.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {FREQUENCY_LABELS[r.frequency]} ·{' '}
                        {r.isActive
                          ? `next ${formatDate(r.nextRunAt, tz)}`
                          : r.endAt && new Date(r.endAt) < new Date()
                            ? 'ended'
                            : 'paused'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'tabular font-semibold',
                        r.type === 'expense' ? 'text-expense' : 'text-income',
                      )}
                    >
                      {r.type === 'expense' ? '−' : '+'}
                      {formatMoney(r.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={r.isActive ? `Pause ${r.title}` : `Resume ${r.title}`}
                      onClick={() =>
                        void m.update
                          .mutateAsync({ id: r.id, body: { isActive: !r.isActive } })
                          .then(() => toast(r.isActive ? 'Paused' : 'Resumed'))
                      }
                    >
                      {r.isActive ? <Pause /> : <Play />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${r.title}`}
                      onClick={() => setDialog({ open: true, editing: r })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-expense"
                      aria-label={`Delete ${r.title}`}
                      onClick={() =>
                        void m.remove.mutateAsync(r.id).then(() => toast(`Deleted “${r.title}”`))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Entries are added automatically when they're due (checked every few minutes). Past entries
          created from a rule stay in your history if you delete the rule.
        </p>
      </div>
      <RecurringDialog
        key={`${dialog.editing?.id ?? 'new'}-${dialog.open}`}
        open={dialog.open}
        editing={dialog.editing}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
}
