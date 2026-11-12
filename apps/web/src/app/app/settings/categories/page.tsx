'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Lock,
  Pencil,
  Plus,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { CATEGORY_ICON_CHOICES } from '@paipai/shared/categories';
import type { Category, TransactionType } from '@paipai/shared/schemas';
import { categoryColors } from '@paipai/shared/tokens';
import { PageHeader } from '@/components/app/app-shell';
import { CategoryIcon } from '@/components/category-icon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Card,
  ErrorState,
  FieldError,
  Input,
  Label,
  Segmented,
  Skeleton,
} from '@/components/ui/primitives';
import { api, ApiError } from '@/lib/api';
import { useCategoryMutations } from '@/lib/queries';
import { cn } from '@/lib/utils';

function useAllCategories() {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () =>
      api
        .request<{ items: Category[] }>('/api/categories', { query: { includeArchived: 'true' } })
        .then((r) => r.items),
  });
}

function CategoryDialog({
  open,
  onOpenChange,
  editing,
  type,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Category | null;
  type: TransactionType;
}) {
  const m = useCategoryMutations();
  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? 'circle-ellipsis');
  const [color, setColor] = useState(editing?.color ?? categoryColors[0]);
  const [error, setError] = useState<string>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Give the category a name');
    try {
      if (editing)
        await m.update.mutateAsync({ id: editing.id, body: { name: name.trim(), icon, color } });
      else await m.create.mutateAsync({ name: name.trim(), icon, color, type });
      toast.success(editing ? 'Category updated' : 'Category created');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent title={editing ? 'Edit category' : `New ${type} category`}>
          <form onSubmit={submit} className="space-y-5 pb-2" noValidate>
            <div className="flex items-center gap-3">
              <CategoryIcon icon={icon} color={color} size="lg" />
              <div className="flex-1">
                <Label htmlFor="c-name">Name</Label>
                <Input
                  id="c-name"
                  autoFocus
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pets"
                />
              </div>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Icon</legend>
              <div className="grid grid-cols-8 gap-1.5">
                {CATEGORY_ICON_CHOICES.map((i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={i.replace(/-/g, ' ')}
                    aria-pressed={icon === i}
                    onClick={() => setIcon(i)}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-xl',
                      icon === i ? 'ring-2 ring-accent' : 'hover:bg-surface-muted',
                    )}
                  >
                    <CategoryIcon icon={i} color={icon === i ? color : '#F0F2EC'} size="sm" />
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Colour</legend>
              <div className="flex flex-wrap items-center gap-2">
                {categoryColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    aria-pressed={color.toLowerCase() === c.toLowerCase()}
                    onClick={() => setColor(c)}
                    className={cn(
                      'size-9 rounded-full',
                      color.toLowerCase() === c.toLowerCase() &&
                        'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                    )}
                    style={{ background: c }}
                  />
                ))}
                <label
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-xs"
                  title="Custom colour"
                >
                  <span className="sr-only">Custom colour</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value.toUpperCase())}
                    className="size-0 opacity-0"
                  />
                  +
                </label>
              </div>
            </fieldset>
            <FieldError>{error}</FieldError>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={m.create.isPending || m.update.isPending}
            >
              {editing ? 'Save' : 'Create category'}
            </Button>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default function CategoriesPage() {
  const q = useAllCategories();
  const m = useCategoryMutations();
  const [type, setType] = useState<TransactionType>('expense');
  const [dialog, setDialog] = useState<{ open: boolean; editing: Category | null }>({
    open: false,
    editing: null,
  });
  const all = (q.data ?? []).filter((c) => c.type === type);
  const system = all.filter((c) => c.isSystem);
  const custom = all.filter((c) => !c.isSystem && !c.isArchived);
  const archived = all.filter((c) => !c.isSystem && c.isArchived);

  async function move(i: number, dir: -1 | 1) {
    const ids = custom.map((c) => c.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j] as string, ids[i] as string];
    await m.reorder.mutateAsync(ids);
    void q.refetch();
  }

  async function setArchived(c: Category, isArchived: boolean) {
    await m.update.mutateAsync({ id: c.id, body: { isArchived } });
    void q.refetch();
    toast(isArchived ? `Archived “${c.name}”` : `Restored “${c.name}”`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Categories"
        subtitle={
          <Link href="/app/settings" className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="size-4" aria-hidden /> Settings
          </Link>
        }
        action={
          <Button onClick={() => setDialog({ open: true, editing: null })}>
            <Plus /> New
          </Button>
        }
      />
      <div className="space-y-4 px-4 pt-4 sm:px-8">
        <Segmented
          label="Category type"
          value={type}
          onChange={setType}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />
        {q.isError ? (
          <ErrorState onRetry={() => void q.refetch()} />
        ) : q.isLoading ? (
          <Skeleton className="h-80" />
        ) : (
          <>
            <Card className="p-2">
              <h2 className="px-3 pb-1 pt-2 font-semibold">Your categories</h2>
              {custom.length === 0 ? (
                <p className="px-3 pb-3 text-sm text-muted-foreground">
                  No custom categories yet. Create one for things like Pets, Kids or Office.
                </p>
              ) : (
                <ul>
                  {custom.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-2">
                      <CategoryIcon icon={c.icon} color={c.color} />
                      <span className="flex-1 truncate font-medium">{c.name}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move ${c.name} up`}
                        disabled={i === 0}
                        onClick={() => void move(i, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move ${c.name} down`}
                        disabled={i === custom.length - 1}
                        onClick={() => void move(i, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => setDialog({ open: true, editing: c })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Archive ${c.name}`}
                        onClick={() => void setArchived(c, true)}
                      >
                        <Archive />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {archived.length > 0 && (
              <Card className="p-2">
                <h2 className="px-3 pb-1 pt-2 font-semibold">Archived</h2>
                <ul>
                  {archived.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 opacity-70"
                    >
                      <CategoryIcon icon={c.icon} color={c.color} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => void setArchived(c, false)}>
                        <ArchiveRestore /> Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card className="p-2">
              <h2 className="flex items-center gap-2 px-3 pb-1 pt-2 font-semibold">
                <Lock className="size-4 text-muted-foreground" aria-hidden /> Built-in
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2">
                {system.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-2 py-2">
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <span className="truncate text-sm">{c.name}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
      <CategoryDialog
        key={`${dialog.editing?.id ?? 'new'}-${dialog.open}-${type}`}
        open={dialog.open}
        editing={dialog.editing}
        type={type}
        onOpenChange={(open) => {
          setDialog((d) => ({ ...d, open }));
          if (!open) void q.refetch();
        }}
      />
    </div>
  );
}
