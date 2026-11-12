'use client';

import { DropdownMenu } from 'radix-ui';
import { Copy, EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatTime } from '@paipai/shared/date';
import { PAYMENT_METHOD_LABELS, type Category, type Transaction } from '@paipai/shared/schemas';
import { CategoryIcon } from '@/components/category-icon';
import { Amount } from '@/components/money';
import { useActionErrorHandler } from '@/lib/action-errors';
import { useDuplicateTransaction } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { useDeleteWithUndo } from './quick-add-dialog';
import { useQuickAdd } from './quick-add-context';

export function TransactionRow({
  t,
  category,
  tz,
  showActions = true,
  timeLabel,
}: {
  t: Transaction;
  category?: Category;
  tz: string;
  showActions?: boolean;
  timeLabel?: string;
}) {
  const { openEdit } = useQuickAdd();
  const duplicate = useDuplicateTransaction();
  const deleteWithUndo = useDeleteWithUndo();
  const onActionError = useActionErrorHandler();
  const subtitle = [t.note, timeLabel ?? formatTime(t.occurredAt, tz)].filter(Boolean).join(' · ');

  const item =
    'flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm outline-none data-[highlighted]:bg-surface-muted';

  return (
    <li className="group flex items-center gap-1">
      <button
        type="button"
        onClick={() => openEdit(t)}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-muted"
        aria-label={`Edit ${t.title}`}
      >
        <CategoryIcon icon={category?.icon} color={category?.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{t.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        <span className="flex flex-col items-end">
          <Amount amount={t.amount} type={t.type} className="text-sm" />
          <span className="text-xs text-muted-foreground">
            {category?.name ?? PAYMENT_METHOD_LABELS[t.paymentMethod]}
          </span>
        </span>
      </button>
      {showActions && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label={`More actions for ${t.title}`}
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-surface-muted hover:text-foreground focus-visible:opacity-100 data-[state=open]:opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
            )}
          >
            <EllipsisVertical className="size-4" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="z-50 w-44 rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-pop)]"
            >
              <DropdownMenu.Item className={item} onSelect={() => openEdit(t)}>
                <Pencil className="size-4" aria-hidden /> Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={item}
                onSelect={() =>
                  void duplicate.mutateAsync(t.id).then(
                    () => toast.success('Duplicated'),
                    (err: unknown) => onActionError(err, 'Could not duplicate. Please try again.'),
                  )
                }
              >
                <Copy className="size-4" aria-hidden /> Duplicate
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={cn(item, 'text-expense')}
                onSelect={() => void deleteWithUndo(t)}
              >
                <Trash2 className="size-4" aria-hidden /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </li>
  );
}

export function TransactionRowSkeleton() {
  return (
    <li className="flex items-center gap-3 px-3 py-3" aria-hidden>
      <span className="size-9 animate-pulse rounded-lg bg-surface-muted" />
      <span className="flex-1 space-y-2">
        <span className="block h-3.5 w-1/3 animate-pulse rounded bg-surface-muted" />
        <span className="block h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
      </span>
      <span className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
    </li>
  );
}
