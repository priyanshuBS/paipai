'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { formatMoney, parseRupeesToPaise } from '@paipai/shared/money';
import { LogoMark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Chip, FieldError } from '@/components/ui/primitives';
import { useMe, useUpdateMe } from '@/lib/queries';
import { firstName } from '@/lib/utils';

const PRESETS = [10_000_00, 20_000_00, 30_000_00, 50_000_00];

export default function WelcomePage() {
  const router = useRouter();
  const { data: me } = useMe();
  const update = useUpdateMe();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const paise = parseRupeesToPaise(value);
    if (!paise) {
      setError('Enter a budget like 20000, or skip for now.');
      return;
    }
    await update.mutateAsync({ monthlyBudget: paise });
    router.replace('/app');
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center px-4 py-10">
      <LogoMark className="size-12 text-forest dark:text-lime" />
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
        Welcome{me ? `, ${firstName(me.name)}` : ''}! 🎉
      </h1>
      <p className="mt-2 text-muted-foreground">
        Want a monthly budget? PaiPai will show your progress and warn you at 80%. This step is
        optional and you can change it anytime.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <label htmlFor="budget" className="block text-sm font-medium">
          Monthly budget
        </label>
        <div className="flex items-center gap-2 rounded-[22px] bg-accent-soft px-5 py-4 dark:bg-surface-muted">
          <span className="text-3xl font-semibold text-muted-foreground" aria-hidden>
            ₹
          </span>
          <input
            id="budget"
            inputMode="decimal"
            autoFocus
            placeholder="20,000"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^\d.,]/g, ''));
              setError(undefined);
            }}
            aria-invalid={!!error || undefined}
            className="w-full bg-transparent text-4xl font-semibold tabular-nums focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Chip
              key={p}
              selected={parseRupeesToPaise(value) === p}
              onClick={() => setValue(String(p / 100))}
            >
              {formatMoney(p)}
            </Chip>
          ))}
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" size="lg" className="w-full" loading={update.isPending}>
          Set budget
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={() => router.replace('/app')}
        >
          Skip for now
        </Button>
      </form>
    </div>
  );
}
