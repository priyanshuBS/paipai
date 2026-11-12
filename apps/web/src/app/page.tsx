import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CloudOff,
  Fingerprint,
  Plus,
  Repeat,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '@/components/brand';
import { CategoryIcon } from '@/components/category-icon';
import { Ring } from '@/components/charts/mini';
import { ProductPreview } from '@/components/landing/product-preview';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const faqs = [
  {
    q: 'Is my data private?',
    a: 'Your expenses are visible only to you. You can export them at any time, or delete your account and all of its data from settings.',
  },
  {
    q: 'Do I need to connect my bank account?',
    a: 'No. PaiPai never asks for bank logins or reads your SMS. You add what you spend, which takes a few seconds, so your data stays yours.',
  },
  {
    q: 'Does it work in rupees and Indian time?',
    a: 'Yes. Amounts are in ₹ with Indian digit grouping, and days and months follow Asia/Kolkata time by default. You can change both in settings.',
  },
  {
    q: 'Can I use it on my phone and laptop?',
    a: 'Yes. Sign in on the website or the Android and iOS app with the same email or Google account, and your data syncs everywhere.',
  },
  {
    q: 'How do I sign in without a password?',
    a: 'Enter your email and we send you a 6-digit code. You can also continue with Google.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Download your transactions as CSV or as a PDF statement for any date range.',
  },
];

const steps = [
  {
    title: 'Add it as you spend',
    body: 'Amount, a word or two, done. PaiPai remembers the category and how you paid.',
  },
  {
    title: 'Watch the picture form',
    body: 'Daily trends, categories and item-wise totals build themselves from your entries.',
  },
  {
    title: 'Stay on budget',
    body: 'Set a monthly limit. A nudge at 80%, a clear warning at 100%, nothing in between.',
  },
];

/** Small card shell for the bento grid. */
function Tile({
  title,
  body,
  className,
  children,
}: {
  title: string;
  body: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-[22px] border border-border bg-surface p-6 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="flex-1">{children}</div>
      <h3 className="mt-6 text-[17px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden bg-hero pb-40 text-hero-foreground sm:pb-56">
        <div aria-hidden className="ledger-grid absolute inset-0" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_0%,rgb(var(--pp-brand)/.22),transparent_70%)]"
        />
        <nav
          className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
          aria-label="Main"
        >
          <Link href="/" aria-label="PaiPai home">
            <Logo className="text-hero-foreground" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="#features"
              className="hidden rounded-lg px-3 py-2 text-sm text-hero-muted hover:text-hero-foreground sm:inline-flex"
            >
              Features
            </a>
            <a
              href="#faq"
              className="hidden rounded-lg px-3 py-2 text-sm text-hero-muted hover:text-hero-foreground sm:inline-flex"
            >
              FAQ
            </a>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm text-hero-muted hover:text-hero-foreground"
            >
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants({ variant: 'brand', size: 'sm' })}>
              Get started
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto max-w-4xl px-4 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-hero-border bg-hero-surface/70 px-3 py-1 text-xs text-hero-muted">
            <span className="size-1.5 rounded-full bg-brand" /> Expense tracking, made for India
          </p>
          <h1 className="mt-6 font-display text-[3.25rem] leading-[1.02] tracking-[-0.02em] sm:text-[5.5rem]">
            Every rupee,
            <br />
            <em className="text-brand">accounted for.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-hero-muted">
            PaiPai is a calm, fast ledger for your daily spending. Add an expense in seconds, see
            exactly where your money goes, and stay inside your budget on web and phone.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className={buttonVariants({ variant: 'brand', size: 'lg' })}>
              Start for free <ArrowRight />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: 'hero', size: 'lg' })}>
              Log in
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-hero-muted">
            {['No bank access needed', 'Works offline', 'Web, Android and iOS'].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-brand" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main>
        {/* Product preview, overlapping the hero */}
        <div className="relative mx-auto -mt-32 max-w-6xl px-4 sm:-mt-44 sm:px-6">
          <ProductPreview />
        </div>

        {/* Bento features */}
        <section
          id="features"
          className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6"
          aria-labelledby="features-title"
        >
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-accent">Features</p>
            <h2
              id="features-title"
              className="mt-3 font-display text-[2.6rem] leading-[1.05] tracking-[-0.01em] sm:text-5xl"
            >
              Everything your money needs.{' '}
              <em className="text-muted-foreground">Nothing it doesn&apos;t.</em>
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-6">
            <Tile
              className="md:col-span-4"
              title="Add in seconds"
              body="Type “Au” and PaiPai suggests “Auto fare” with its usual category and payment method. Press N on the web, + on the phone."
            >
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-surface px-4 py-3 ring-4 ring-accent/10">
                  <span className="text-xl text-muted-foreground">₹</span>
                  <span className="tabular text-3xl font-semibold tracking-tight">30</span>
                  <span className="ml-1 h-7 w-px animate-pulse bg-foreground" />
                </div>
                <div className="mt-3 rounded-xl border border-border bg-surface p-1.5">
                  {[
                    ['Auto fare', 'Travel · Cash · used 38×', 'bus', '#7CC4FA'],
                    ['Auto to station', 'Travel · UPI · used 4×', 'bus', '#7CC4FA'],
                  ].map(([t, m, i, c], idx) => (
                    <div
                      key={t}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-2.5 py-2',
                        idx === 0 && 'bg-surface-muted',
                      )}
                    >
                      <CategoryIcon icon={i} color={c} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{t}</p>
                        <p className="text-xs text-muted-foreground">{m}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Tile>

            <Tile
              className="md:col-span-2"
              title="Budgets that warn early"
              body="A nudge at 80%, a warning at 100%, once per period."
            >
              <div className="flex h-full items-center justify-center py-4">
                <Ring percent={82} tone="warn" size={132} stroke={11}>
                  <span className="tabular text-2xl font-semibold">82%</span>
                  <span className="text-[11px] text-muted-foreground">of ₹20,000</span>
                </Ring>
              </div>
            </Tile>

            <Tile
              className="md:col-span-2"
              title="Item-wise totals"
              body="How much went on auto fare this year? The total, the count, every entry."
            >
              <div className="space-y-2">
                {[
                  ['Auto fare', '₹1,240', '38×'],
                  ['Chai', '₹860', '43×'],
                  ['Metro card', '₹600', '3×'],
                ].map(([t, a, n]) => (
                  <div
                    key={t}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="size-3.5 text-muted-foreground" aria-hidden /> {t}
                    </span>
                    <span className="tabular">
                      <span className="font-medium">{a}</span>{' '}
                      <span className="text-muted-foreground">· {n}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Tile>

            <Tile
              className="md:col-span-2"
              title="Recurring, handled"
              body="Rent, SIPs and subscriptions are added on schedule, including any you missed."
            >
              <div className="space-y-2">
                {[
                  ['Rent', 'Every month · 1st', '₹12,000'],
                  ['Mutual fund SIP', 'Every month · 5th', '₹5,000'],
                  ['Gym', 'Every month · 10th', '₹1,500'],
                ].map(([t, m, a]) => (
                  <div
                    key={t}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                  >
                    <Repeat className="size-4 text-accent" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t}</p>
                      <p className="text-xs text-muted-foreground">{m}</p>
                    </div>
                    <span className="tabular text-sm font-medium">{a}</span>
                  </div>
                ))}
              </div>
            </Tile>

            <Tile
              className="relative bg-hero text-hero-foreground md:col-span-2 [&_h3]:text-hero-foreground [&_p]:text-hero-muted"
              title="Private and offline-ready"
              body="No bank logins, no SMS reading. App lock with Face ID or fingerprint, and offline entries sync later."
            >
              <div className="flex h-full flex-wrap content-center gap-3 py-2">
                {[
                  [ShieldCheck, 'No bank access'],
                  [Fingerprint, 'App lock'],
                  [CloudOff, 'Works offline'],
                ].map(([Icon, label]) => {
                  const I = Icon as typeof ShieldCheck;
                  return (
                    <span
                      key={label as string}
                      className="inline-flex items-center gap-2 rounded-full border border-hero-border bg-hero-surface px-3 py-1.5 text-sm text-hero-foreground"
                    >
                      <I className="size-4 text-brand" aria-hidden /> {label as string}
                    </span>
                  );
                })}
              </div>
            </Tile>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border bg-surface" aria-labelledby="how-title">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <h2
              id="how-title"
              className="max-w-xl font-display text-[2.6rem] leading-[1.05] tracking-[-0.01em] sm:text-5xl"
            >
              A habit that takes <em className="text-accent">five seconds</em> a day.
            </h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="border-t border-border pt-6">
                  <span className="font-display text-5xl leading-none text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Built for India */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-labelledby="india-title">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2
                id="india-title"
                className="font-display text-[2.6rem] leading-[1.05] tracking-[-0.01em] sm:text-5xl"
              >
                Built for how <em className="text-accent">India</em> spends.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                Rupees, UPI and Indian time are the default, not an afterthought. Your data is
                yours: export it whenever you like, or delete it in one step.
              </p>
            </div>
            <dl className="divide-y divide-border overflow-hidden rounded-[22px] border border-border bg-surface shadow-[var(--shadow-card)]">
              {[
                ['Indian number format', '₹1,23,456, not ₹123,456'],
                ['UPI, card, cash and bank', 'Track how you pay, not just what'],
                ['Indian time by default', 'Days and months follow IST'],
                ['Exports that open in Excel', 'CSV and a PDF statement'],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="flex flex-col gap-0.5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <dt className="font-medium">{title}</dt>
                  <dd className="text-sm text-muted-foreground">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="mx-auto max-w-6xl scroll-mt-16 px-4 pb-24 sm:px-6"
          aria-labelledby="faq-title"
        >
          <div className="grid gap-10 md:grid-cols-[1fr_1.6fr]">
            <h2
              id="faq-title"
              className="font-display text-[2.6rem] leading-[1.05] tracking-[-0.01em] sm:text-5xl"
            >
              Questions, <em className="text-muted-foreground">answered.</em>
            </h2>
            <div className="divide-y divide-border border-y border-border">
              {faqs.map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-open:border-accent group-open:bg-accent group-open:text-accent-foreground">
                      <Plus
                        className="size-3.5 transition-transform group-open:rotate-45"
                        aria-hidden
                      />
                    </span>
                  </summary>
                  <p className="pb-5 pr-10 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-hero px-6 py-16 text-center text-hero-foreground sm:px-12 sm:py-20">
            <div aria-hidden className="ledger-grid absolute inset-0" />
            <div aria-hidden className="saffron-glow absolute inset-0" />
            <div className="relative">
              <h2 className="font-display text-[2.6rem] leading-[1.05] tracking-[-0.01em] sm:text-6xl">
                Start your <em className="text-brand">hisaab</em> today.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-hero-muted">
                Sign up with your email or Google. It takes under a minute, and it&apos;s free.
              </p>
              <Link
                href="/signup"
                className={cn(buttonVariants({ variant: 'brand', size: 'lg' }), 'mt-8')}
              >
                Get started <ArrowRight />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo markClassName="size-5" className="[&>span]:text-sm" />
            <span>Paai-paai ka hisaab</span>
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Sign up
            </Link>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </div>
          <p>© {new Date().getFullYear()} PaiPai</p>
        </div>
      </footer>
    </div>
  );
}
