import Link from 'next/link';
import {
  ArrowRight,
  ChartColumn,
  ChevronDown,
  CloudOff,
  Fingerprint,
  Repeat,
  Search,
  Target,
  Timer,
} from 'lucide-react';
import { Logo } from '@/components/brand';
import { AnalyticsMock, DashboardMock } from '@/components/landing/phone-mockups';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Timer,
    title: 'Add in under 5 seconds',
    body: 'Type “Au” and PaiPai suggests “Auto fare” with its usual category. Amount, done.',
  },
  {
    icon: ChartColumn,
    title: 'Analytics that make sense',
    body: 'Daily, weekly, monthly and yearly trends, category splits, and when you spend most.',
  },
  {
    icon: Search,
    title: 'Item-wise hisaab',
    body: '“How much have I spent on auto fare?” See the total, the count and the history for any item.',
  },
  {
    icon: Target,
    title: 'Budgets that nudge',
    body: 'Set an overall or per-category budget. PaiPai warns you at 80% and again at 100%.',
  },
  {
    icon: Repeat,
    title: 'Recurring, handled',
    body: 'Rent, gym and metro pass are added automatically on schedule.',
  },
  {
    icon: CloudOff,
    title: 'Works offline',
    body: 'Add expenses with no signal on the app. They sync as soon as you’re back online.',
  },
];

const faqs = [
  {
    q: 'Is my data private?',
    a: 'Your expenses are visible only to you. You can export them at any time, or delete your account and all of its data from settings.',
  },
  {
    q: 'Do I need to connect my bank account?',
    a: 'No. PaiPai never asks for bank logins or reads your SMS. You add what you spend (it takes a few seconds), so your data stays yours.',
  },
  {
    q: 'Does it work in rupees and Indian time?',
    a: 'Yes. Amounts are in ₹ with Indian digit grouping (₹1,23,456), and days and months follow Asia/Kolkata time by default. You can change both in settings.',
  },
  {
    q: 'Can I use it on my phone and laptop?',
    a: 'Yes. Sign in on the website or the Android/iOS app with the same email or Google account, and your data syncs everywhere.',
  },
  {
    q: 'How do I sign in without a password?',
    a: 'Enter your email and we send you a 6-digit code. You can also continue with Google.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Download your transactions as CSV or PDF for any date range.',
  },
];

export default function LandingPage() {
  return (
    <div className="bg-background">
      {/* ── Hero ── */}
      <header className="relative overflow-hidden bg-lime text-forest">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6"
          aria-label="Main"
        >
          <Logo className="text-forest dark:text-forest" />
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'text-forest hover:bg-forest/10',
              )}
            >
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
              Get Started
            </Link>
          </div>
        </nav>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-6 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-12">
          <div>
            <p className="inline-flex rounded-full bg-forest/10 px-3 py-1 text-sm font-semibold">
              Paai-paai ka hisaab
            </p>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Track Your Spending Effortlessly
            </h1>
            <p className="mt-5 max-w-lg text-lg text-forest/80">
              Log your expenses in seconds and see exactly where your money goes, from auto fare to
              rent. Built for India, in ₹.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className={buttonVariants({ size: 'lg' })}>
                Get Started <ArrowRight />
              </Link>
              <Link
                href="/login"
                className="text-sm font-semibold underline-offset-4 hover:underline"
              >
                Already have an account? Login
              </Link>
            </div>
          </div>
          <div className="relative flex justify-center md:justify-end">
            <div
              aria-hidden
              className="absolute -right-10 top-10 size-72 rounded-full bg-lime-light/70 blur-2xl"
            />
            <DashboardMock className="relative rotate-[-3deg]" />
          </div>
        </div>
      </header>

      <main>
        {/* ── Features ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="features-title">
          <h2
            id="features-title"
            className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Everything you need to know where your money goes
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-soft)]"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-forest dark:text-lime">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Screens ── */}
        <section className="bg-forest py-20 text-white" aria-labelledby="screens-title">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2">
            <div>
              <h2 id="screens-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                See your spending <span className="text-lime">at a glance</span>
              </h2>
              <ul className="mt-6 space-y-4 text-white/85">
                <li>• See how this week compares to last, e.g. “↓ 4.8% from last week”.</li>
                <li>
                  • A clear category breakdown showing how much went on travel, food and groceries.
                </li>
                <li>• Patterns by day of the week and time of day.</li>
                <li>• A yearly overview with a 12-month chart.</li>
              </ul>
              <div className="mt-8 flex items-center gap-3 text-sm text-white/70">
                <Fingerprint className="size-5 text-lime" aria-hidden /> Optional fingerprint / Face
                ID lock on the app
              </div>
            </div>
            <div className="flex justify-center gap-6">
              <AnalyticsMock className="rotate-[2deg]" />
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-lime p-8 text-forest sm:flex-row sm:items-center sm:p-12">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Start your hisaab today</h2>
              <p className="mt-2 text-forest/80">
                Sign up with your email or Google. It takes under a minute.
              </p>
            </div>
            <Link href="/signup" className={buttonVariants({ size: 'lg' })}>
              Get Started <ArrowRight />
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-3xl font-extrabold tracking-tight">
            Questions, answered
          </h2>
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl bg-surface p-5 shadow-[var(--shadow-soft)]"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <ChevronDown
                    className="size-5 shrink-0 transition group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-2 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo markClassName="size-6" className="[&>span]:text-base" />
            <span>Paai-paai ka hisaab</span>
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Sign up
            </Link>
            <a href="#faq-title" className="hover:text-foreground">
              FAQ
            </a>
          </div>
          <p>© {new Date().getFullYear()} PaiPai</p>
        </div>
      </footer>
    </div>
  );
}
