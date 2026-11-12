import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Lock,
  Pencil,
  Plus,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { CATEGORY_ICON_CHOICES } from '@paipai/shared/categories';
import type { Category, TransactionType } from '@paipai/shared/schemas';
import { categoryColors } from '@paipai/shared/tokens';
import { CategoryIcon } from '@/components/category-icon';
import { Sheet } from '@/components/sheet';
import { useSnackbar } from '@/components/snackbar';
import {
  Button,
  Card,
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
import { useAllCategories, useCategoryMutations } from '@/lib/queries';
import { useTheme } from '@/theme/theme';

function CategoryForm({
  editing,
  type,
  onClose,
}: {
  editing: Category | null;
  type: TransactionType;
  onClose: () => void;
}) {
  const m = useCategoryMutations();
  const snack = useSnackbar();
  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? 'circle-ellipsis');
  const [color, setColor] = useState<string>(editing?.color ?? categoryColors[0]);
  const [error, setError] = useState<string>();

  async function save() {
    if (!name.trim()) return setError('Give the category a name');
    try {
      if (editing)
        await m.update.mutateAsync({ id: editing.id, body: { name: name.trim(), icon, color } });
      else await m.create.mutateAsync({ name: name.trim(), icon, color, type });
      snack(editing ? 'Category updated' : 'Category created');
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save');
    }
  }

  return (
    <Sheet
      visible
      title={editing ? 'Edit category' : `New ${type} category`}
      onClose={onClose}
      footer={
        <Button
          title={editing ? 'Save' : 'Create category'}
          size="lg"
          loading={m.create.isPending || m.update.isPending}
          onPress={() => void save()}
        />
      }
    >
      <View className="flex-row items-center gap-3">
        <CategoryIcon icon={icon} color={color} size="lg" />
        <View className="flex-1">
          <Label>Name</Label>
          <Input
            value={name}
            onChangeText={setName}
            maxLength={40}
            placeholder="e.g. Pets"
            autoFocus={!editing}
          />
        </View>
      </View>
      <View>
        <Label>Icon</Label>
        <View className="flex-row flex-wrap">
          {CATEGORY_ICON_CHOICES.map((i) => (
            <View key={i} className="w-1/6 p-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={i.replace(/-/g, ' ')}
                accessibilityState={{ selected: icon === i }}
                onPress={() => setIcon(i)}
                className={cn(
                  'aspect-square items-center justify-center rounded-xl border-2',
                  icon === i ? 'border-accent' : 'border-transparent',
                )}
              >
                <CategoryIcon icon={i} color={icon === i ? color : '#F0F2EC'} size="sm" />
              </Pressable>
            </View>
          ))}
        </View>
      </View>
      <View>
        <Label>Colour</Label>
        <View className="flex-row flex-wrap gap-3">
          {categoryColors.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${c}`}
              accessibilityState={{ selected: color === c }}
              onPress={() => setColor(c)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: c,
                borderWidth: color === c ? 3 : 0,
                borderColor: '#1E3A1A',
              }}
            />
          ))}
        </View>
      </View>
      <FieldError>{error}</FieldError>
    </Sheet>
  );
}

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const q = useAllCategories();
  const m = useCategoryMutations();
  const snack = useSnackbar();
  const [type, setType] = useState<TransactionType>('expense');
  const [form, setForm] = useState<{ open: boolean; editing: Category | null }>({
    open: false,
    editing: null,
  });
  const all = (q.data ?? []).filter((c) => c.type === type);
  const custom = all.filter((c) => !c.isSystem && !c.isArchived);
  const archived = all.filter((c) => !c.isSystem && c.isArchived);
  const system = all.filter((c) => c.isSystem);

  const move = async (i: number, dir: -1 | 1) => {
    const ids = custom.map((c) => c.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j] as string, ids[i] as string];
    await m.reorder.mutateAsync(ids);
  };

  const setArchived = async (c: Category, isArchived: boolean) => {
    await m.update.mutateAsync({ id: c.id, body: { isArchived } });
    snack(isArchived ? `Archived “${c.name}”` : `Restored “${c.name}”`);
  };

  const iconBtn = 'h-11 w-11 items-center justify-center';

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-4 px-4 pb-28 pt-2">
        <Segmented
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
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <Card className="px-0 py-2">
              <Text weight="semibold" className="px-4 pb-1 text-base">
                Your categories
              </Text>
              {custom.length === 0 ? (
                <Text muted className="px-4 pb-2 text-sm">
                  No custom categories yet. Create one for things like Pets, Kids or Office.
                </Text>
              ) : (
                custom.map((c, i) => (
                  <View key={c.id} className="flex-row items-center gap-1 px-3 py-1">
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <Text weight="medium" className="ml-2 flex-1" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${c.name} up`}
                      disabled={i === 0}
                      onPress={() => void move(i, -1)}
                      className={cn(iconBtn, i === 0 && 'opacity-30')}
                    >
                      <ArrowUp size={18} color={colors.text} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${c.name} down`}
                      disabled={i === custom.length - 1}
                      onPress={() => void move(i, 1)}
                      className={cn(iconBtn, i === custom.length - 1 && 'opacity-30')}
                    >
                      <ArrowDown size={18} color={colors.text} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${c.name}`}
                      onPress={() => setForm({ open: true, editing: c })}
                      className={iconBtn}
                    >
                      <Pencil size={18} color={colors.text} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Archive ${c.name}`}
                      onPress={() => void setArchived(c, true)}
                      className={iconBtn}
                    >
                      <Archive size={18} color={colors.text} />
                    </Pressable>
                  </View>
                ))
              )}
            </Card>
            {archived.length > 0 && (
              <Card className="px-0 py-2">
                <Text weight="semibold" className="px-4 pb-1 text-base">
                  Archived
                </Text>
                {archived.map((c) => (
                  <View key={c.id} className="flex-row items-center gap-3 px-4 py-1 opacity-70">
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <Text className="flex-1">{c.name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Restore ${c.name}`}
                      onPress={() => void setArchived(c, false)}
                      className={iconBtn}
                    >
                      <ArchiveRestore size={18} color={colors.text} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            )}
            <Card className="px-0 py-2">
              <View className="flex-row items-center gap-2 px-4 pb-1">
                <Lock size={14} color={colors.textSecondary} />
                <Text weight="semibold" className="text-base">
                  Built-in
                </Text>
              </View>
              <View className="flex-row flex-wrap px-2">
                {system.map((c) => (
                  <View key={c.id} className="w-1/2 flex-row items-center gap-2 p-2">
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    <Text className="flex-1 text-sm" numberOfLines={1}>
                      {c.name}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}
      </ScrollView>
      <View className="absolute bottom-8 left-4 right-4">
        <Button
          title="New category"
          size="lg"
          icon={<Plus size={18} color="#fff" />}
          onPress={() => setForm({ open: true, editing: null })}
        />
      </View>
      {form.open && (
        <CategoryForm
          editing={form.editing}
          type={type}
          onClose={() => setForm({ open: false, editing: null })}
        />
      )}
    </View>
  );
}
