'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  Camera,
  ChevronRight,
  LogOut,
  MonitorSmartphone,
  Repeat,
  Tags,
  Target,
  Trash2,
} from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  CURRENCIES,
  TIMEZONES,
  UPLOAD_CONTENT_TYPES,
  RECEIPT_MAX_BYTES,
} from '@paipai/shared/settings';
import type { ThemePreference } from '@paipai/shared/schemas';
import { PageHeader } from '@/components/app/app-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Card,
  FieldError,
  Input,
  Label,
  Segmented,
  Select,
  Skeleton,
} from '@/components/ui/primitives';
import { ApiError, api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { uploadImage, useMe, useUpdateMe, useUploadsEnabled } from '@/lib/queries';

function Row({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-3 rounded-2xl px-3 hover:bg-surface-muted"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-forest dark:bg-surface-muted dark:text-lime">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (confirm !== 'DELETE') return;
    setBusy(true);
    try {
      await api.deleteMe();
      await authClient.signOut().catch(() => undefined);
      qc.clear();
      router.replace('/');
      toast('Your account and all data were deleted.');
    } catch {
      toast.error('Could not delete your account. Please try again.');
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent title="Delete account">
          <form onSubmit={submit} className="space-y-4 pb-2">
            <p className="text-sm">
              This permanently deletes your account and <strong>all</strong> your transactions,
              categories, budgets and recurring rules. This can&apos;t be undone. Consider exporting
              your data first.
            </p>
            <div>
              <Label htmlFor="del-confirm">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="del-confirm"
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              size="lg"
              className="w-full"
              disabled={confirm !== 'DELETE'}
              loading={busy}
            >
              Delete my account forever
            </Button>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default function SettingsPage() {
  const { data: me } = useMe();
  const update = useUpdateMe();
  const uploads = useUploadsEnabled();
  const { setTheme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string>();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (name === null) return;
    try {
      await update.mutateAsync({ name });
      setName(null);
      toast.success('Name updated');
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : 'Could not save');
    }
  }

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    if (!(UPLOAD_CONTENT_TYPES as readonly string[]).includes(file.type))
      return toast.error('Please choose a JPG, PNG, WebP or HEIC image');
    if (file.size > RECEIPT_MAX_BYTES) return toast.error('Image must be under 5 MB');
    setAvatarBusy(true);
    try {
      const url = await uploadImage(file, 'avatar');
      await update.mutateAsync({ image: url });
      toast.success('Photo updated');
    } catch {
      toast.error('Could not upload the photo');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function signOutAll() {
    const { error } = await authClient.revokeSessions();
    if (error) return toast.error(error.message ?? 'Could not log out from all devices');
    await authClient.signOut();
    qc.clear();
    router.replace('/login');
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-8">
        <Skeleton className="h-96" />
      </div>
    );
  }
  const tzOptions = TIMEZONES.some((t) => t.id === me.timezone)
    ? TIMEZONES
    : [{ id: me.timezone, label: me.timezone }, ...TIMEZONES];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" />
      <div className="space-y-4 px-4 pt-4 sm:px-8">
        <Card>
          <h2 className="mb-4 font-semibold">Profile</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              {me.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={me.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-full bg-lime text-xl font-bold text-forest">
                  {me.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              {uploads && (
                <>
                  <button
                    type="button"
                    aria-label="Change profile photo"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-forest text-white shadow"
                    disabled={avatarBusy}
                  >
                    <Camera className="size-4" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void onAvatar(e.target.files?.[0])}
                  />
                </>
              )}
            </div>
            <form onSubmit={saveName} className="flex min-w-0 flex-1 items-end gap-2">
              <div className="min-w-0 flex-1">
                <Label htmlFor="s-name">Name</Label>
                <Input
                  id="s-name"
                  value={name ?? me.name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(undefined);
                  }}
                />
              </div>
              {name !== null && name !== me.name && (
                <Button type="submit" loading={update.isPending}>
                  Save
                </Button>
              )}
            </form>
          </div>
          <FieldError>{nameError}</FieldError>
          <p className="mt-3 text-sm text-muted-foreground">Signed in as {me.email}</p>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Preferences</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-currency">Currency</Label>
              <Select
                id="s-currency"
                className="h-12 w-full rounded-2xl"
                value={me.currency}
                onChange={(e) =>
                  void update
                    .mutateAsync({ currency: e.target.value })
                    .then(() => toast.success('Currency updated'))
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="s-tz">Time zone</Label>
              <Select
                id="s-tz"
                className="h-12 w-full rounded-2xl"
                value={me.timezone}
                onChange={(e) =>
                  void update
                    .mutateAsync({ timezone: e.target.value })
                    .then(() => toast.success('Time zone updated'))
                }
              >
                {tzOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Theme</p>
            <Segmented<ThemePreference>
              label="Theme"
              value={me.theme}
              onChange={(v) => {
                setTheme(v);
                update.mutate({ theme: v });
              }}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          </div>
        </Card>

        <Card className="p-2">
          <Row
            href="/app/settings/categories"
            icon={<Tags className="size-5" />}
            title="Categories"
            subtitle="Create, edit, reorder and archive"
          />
          <Row
            href="/app/budgets"
            icon={<Target className="size-5" />}
            title="Budgets"
            subtitle="Overall and per-category limits"
          />
          <Row
            href="/app/recurring"
            icon={<Repeat className="size-5" />}
            title="Recurring"
            subtitle="Rent, subscriptions, salary"
          />
        </Card>

        <Card className="space-y-2 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() =>
              void authClient.signOut().then(() => {
                qc.clear();
                router.replace('/login');
              })
            }
          >
            <LogOut /> Log out
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => void signOutAll()}
          >
            <MonitorSmartphone /> Log out from all devices
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-expense"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 /> Delete account
          </Button>
        </Card>
      </div>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
