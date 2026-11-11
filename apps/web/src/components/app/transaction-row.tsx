'use client';

import { DropdownMenu } from 'radix-ui';
import { Copy, EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatTime } from '@paipai/shared/date';
import { PAYMENT_METHOD_LABELS, type Category, type Transaction } from '@paipai/shared/schemas';
import { CategoryIcon } from '@/components/category-icon';
import { Amount } from '@/components/money';
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
  const subtitle = [t.note, timeLabel ?? formatTime(t.occurredAt, tz)].filter(Boolean).join(' · ');

  const item =
    'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm outline-none data-[highlighted]:bg-surface-muted';

  return (
    <li className="group flex items-center gap-1">
      <button
        type="button"
        onClick={() => openEdit(t)}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-muted"
        aria-label={`Edit ${t.title}`}
      >
        <CategoryIcon icon={category?.icon} color={category?.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{t.title}</span>
          <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>
        </span>
        <span className="flex flex-col items-end">
          <Amount amount={t.amount} type={t.type} />
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
              'flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted',
            )}
          >
            <EllipsisVertical className="size-5" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="z-50 w-48 rounded-2xl bg-surface p-2 shadow-[var(--shadow-float)] ring-1 ring-border"
            >
              <DropdownMenu.Item className={item} onSelect={() => openEdit(t)}>
                <Pencil className="size-4" aria-hidden /> Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={item}
                onSelect={() =>
                  void duplicate.mutateAsync(t.id).then(() => toast.success('Duplicated'))
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
    <li className="flex items-center gap-3 px-2 py-3" aria-hidden>
      <span className="size-11 animate-pulse rounded-full bg-surface-muted" />
      <span className="flex-1 space-y-2">
        <span className="block h-3.5 w-1/3 animate-pulse rounded bg-surface-muted" />
        <span className="block h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
      </span>
      <span className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
    </li>
  );
}
