'use client';

import { AlertTriangle, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { formatMoney, paiseToInputString, parseRupeesToPaise } from '@paipai/shared/money';
import type { BudgetPeriod, BudgetView } from '@paipai/shared/schemas';
import { PageHeader } from '@/components/app/app-shell';
import { CategoryIcon } from '@/components/category-icon';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Card,
  ErrorState,
  FieldError,
  Input,
  Label,
  Select,
  Skeleton,
} from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { useBudgetMutations, useBudgets, useCategories } from '@/lib/queries';
import { useActionErrorHandler } from '@/lib/action-errors';
import { cn } from '@/lib/utils';

const PERIOD_LABEL: Record<BudgetPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function BudgetCard({
  b,
  onEdit,
  onDelete,
}: {
  b: BudgetView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pct = Math.min(b.percent, 100);
  const bar =
    b.status === 'over' ? 'bg-expense' : b.status === 'warning' ? 'bg-warning' : 'bg-accent';
  const name = b.categoryName ?? 'Overall spending';
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        {b.categoryId ? (
          <CategoryIcon icon={b.categoryIcon} color={b.categoryColor} />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-muted text-muted-foreground">
            <Target className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">
            {PERIOD_LABEL[b.period]} · alert at {b.alertThresholdPercent}%
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${name} budget`} onClick={onEdit}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${name} budget`}
          onClick={onDelete}
          className="text-expense"
        >
          <Trash2 />
        </Button>
      </div>
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="tabular font-semibold">{formatMoney(b.spent)}</span>
          <span className="text-muted-foreground">of {formatMoney(b.amount)}</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={`${name}: ${b.percent}% used`}
        >
          <div
            className={cn('h-full rounded-full transition-all', bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p
          className={cn(
            'mt-2 text-sm',
            b.status === 'over'
              ? 'text-expense'
              : b.status === 'warning'
                ? 'text-warning'
                : 'text-muted-foreground',
          )}
        >
          {b.status === 'over'
            ? `Over by ${formatMoney(-b.remaining)} · ${b.percent}%`
            : `${formatMoney(b.remaining)} left · ${b.percent}% used`}
        </p>
      </div>
    </Card>
  );
}

function BudgetDialog({
  open,
  onOpenChange,
  editing,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: BudgetView | null;
  existing: BudgetView[];
}) {
  const { data: categories = [] } = useCategories();
  const m = useBudgetMutations();
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [period, setPeriod] = useState<BudgetPeriod>(editing?.period ?? 'monthly');
  const [amount, setAmount] = useState(editing ? paiseToInputString(editing.amount) : '');
  const [threshold, setThreshold] = useState(String(editing?.alertThresholdPercent ?? 80));
  const [error, setError] = useState<string>();

  const taken = new Set(
    existing
      .filter((b) => b.period === period && b.id !== editing?.id)
      .map((b) => b.categoryId ?? ''),
  );
  const options = categories.filter((c) => c.type === 'expense' && !c.isArchived);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const paise = parseRupeesToPaise(amount);
    const t = Number(threshold);
    if (!paise) return setError('Enter a budget amount, e.g. 5000');
    if (!Number.isInteger(t) || t < 1 || t > 100)
      return setError('Alert threshold must be between 1 and 100');
    try {
      if (editing)
        await m.update.mutateAsync({
          id: editing.id,
          body: { amount: paise, alertThresholdPercent: t },
        });
      else
        await m.create.mutateAsync({
          categoryId: categoryId || null,
          period,
          amount: paise,
          alertThresholdPercent: t,
        });
      toast.success(editing ? 'Budget updated' : 'Budget created');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the budget');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent title={editing ? 'Edit budget' : 'New budget'}>
          <form onSubmit={submit} className="space-y-4 pb-2" noValidate>
            {!editing && (
              <>
                <div>
                  <Label htmlFor="b-cat">Applies to</Label>
                  <Select
                    id="b-cat"
                    className="w-full"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="" disabled={taken.has('')}>
                      Overall spending{taken.has('') ? ' (already set)' : ''}
                    </option>
                    {options.map((c) => (
                      <option key={c.id} value={c.id} disabled={taken.has(c.id)}>
                        {c.name}
                        {taken.has(c.id) ? ' (already set)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="b-period">Period</Label>
                  <Select
                    id="b-period"
                    className="w-full"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="b-amount">Amount (₹)</Label>
              <Input
                id="b-amount"
                inputMode="decimal"
                autoFocus
                placeholder="5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="b-threshold">Warn me at (% used)</Label>
              <Input
                id="b-threshold"
                inputMode="numeric"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <FieldError>{error}</FieldError>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={m.create.isPending || m.update.isPending}
            >
              {editing ? 'Save budget' : 'Create budget'}
            </Button>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default function BudgetsPage() {
  const q = useBudgets();
  const m = useBudgetMutations();
  const [dialog, setDialog] = useState<{ open: boolean; editing: BudgetView | null }>({
    open: false,
    editing: null,
  });
  const budgets = q.data ?? [];
  const alerts = budgets.filter((b) => b.status !== 'ok');
  const onActionError = useActionErrorHandler();

  async function remove(b: BudgetView) {
    try {
      await m.remove.mutateAsync(b.id);
      toast(`Deleted ${b.categoryName ?? 'overall'} budget`);
    } catch (err) {
      onActionError(err, 'Could not delete the budget. Please try again.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Budgets"
        subtitle="Set limits overall or per category. We'll warn you before you overspend."
        action={
          <Button onClick={() => setDialog({ open: true, editing: null })}>
            <Plus /> New budget
          </Button>
        }
      />
      <div className="space-y-4 px-4 pt-4 sm:px-8">
        {alerts.length > 0 && (
          <div
            role="status"
            className="flex gap-3 rounded-card border border-border border-l-2 border-l-warning bg-surface p-4"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <ul className="space-y-1 text-sm">
              {alerts.map((b) => (
                <li key={b.id}>
                  <strong>{b.categoryName ?? 'Overall'}</strong>:{' '}
                  {b.status === 'over'
                    ? `over budget by ${formatMoney(-b.remaining)}`
                    : `${b.percent}% used, ${formatMoney(b.remaining)} left`}
                </li>
              ))}
            </ul>
          </div>
        )}
        {q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} />
        ) : q.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <Card>
            <EmptyState
              title="No budgets yet"
              description="Start with an overall monthly budget, then add limits for categories like Food or Travel."
              action={
                <Button onClick={() => setDialog({ open: true, editing: null })}>
                  <Plus /> Create a budget
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {budgets.map((b) => (
              <BudgetCard
                key={b.id}
                b={b}
                onEdit={() => setDialog({ open: true, editing: b })}
                onDelete={() => void remove(b)}
              />
            ))}
          </div>
        )}
      </div>
      <BudgetDialog
        key={`${dialog.editing?.id ?? 'new'}-${dialog.open}`}
        open={dialog.open}
        editing={dialog.editing}
        existing={budgets}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
}
