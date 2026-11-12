import Link from 'next/link';
import {
  ArrowRight,
  ChartColumn,
  CloudOff,
  Download,
  Fingerprint,
  Plus,
  Repeat,
  Search,
  Target,
} from 'lucide-react';
import { Logo } from '@/components/brand';
import { ProductPreview } from '@/components/landing/product-preview';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Plus,
    title: 'Add in seconds',
    body: 'Type “Au” and PaiPai suggests “Auto fare” with its usual category and payment method.',
  },
  {
    icon: ChartColumn,
    title: 'Clear analytics',
    body: 'Trends by day, week, month and year, category splits, and when in the week you spend most.',
  },
  {
    icon: Search,
    title: 'Item-wise totals',
    body: 'How much went on auto fare this year? See the total, the count and every entry.',
  },
  {
    icon: Target,
    title: 'Budgets that warn early',
    body: 'Overall or per category. A heads-up at 80% and again when you cross 100%.',
  },
  {
    icon: Repeat,
    title: 'Recurring, handled',
    body: 'Rent, SIPs and subscriptions are added on schedule, including any you missed.',
  },
  {
    icon: CloudOff,
    title: 'Works offline',
    body: 'On the app, expenses added without signal sync as soon as you are back online.',
  },
];

const india = [
  ['Indian number format', '₹1,23,456, not ₹123,456'],
  ['UPI, card, cash and bank', 'Track how you pay, not just what'],
  ['Indian time by default', 'Days and months follow IST'],
  ['Exports that open in Excel', 'CSV and a PDF statement for any range'],
];

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

export default function LandingPage() {
  return (
    <div className="bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
        <nav
          className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6"
          aria-label="Main"
        >
          <Link href="/" aria-label="PaiPai home">
            <Logo />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="#features"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'hidden sm:inline-flex',
              )}
            >
              Features
            </a>
            <a
              href="#faq"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'hidden sm:inline-flex',
              )}
            >
              FAQ
            </a>
            <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-accent">Expense tracking for India</p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                Know where every rupee goes.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                PaiPai is a simple ledger for your daily spending. Add an expense in seconds, set
                budgets, and see clear reports on the web and on your phone.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className={buttonVariants({ size: 'lg' })}>
                  Get started <ArrowRight />
                </Link>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                  Log in
                </Link>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Free · No bank access needed · Web, Android and iOS
              </p>
            </div>
            <ProductPreview className="mt-14" />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16" aria-labelledby="features-title">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="max-w-xl">
              <h2 id="features-title" className="text-3xl font-semibold tracking-tight">
                Everything a personal ledger needs
              </h2>
              <p className="mt-3 text-muted-foreground">
                Nothing you have to configure first. Start adding expenses and the reports fill in.
              </p>
            </div>
            <dl className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="border-t border-border pt-6">
                  <dt className="flex items-center gap-2.5 font-medium">
                    <f.icon className="size-4 text-muted-foreground" aria-hidden />
                    {f.title}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Built for India */}
        <section className="border-y border-border bg-background" aria-labelledby="india-title">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center">
            <div>
              <h2 id="india-title" className="text-3xl font-semibold tracking-tight">
                Built for how India spends
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Rupees, UPI and Indian time are the default, not an afterthought. Your data is
                yours: export it whenever you like, or delete it in one step.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Fingerprint className="size-4" aria-hidden /> Face ID / fingerprint lock
                </span>
                <span className="inline-flex items-center gap-2">
                  <Download className="size-4" aria-hidden /> CSV and PDF export
                </span>
              </div>
            </div>
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface">
              {india.map(([title, body]) => (
                <div
                  key={title}
                  className="flex flex-col gap-0.5 px-5 py-4 sm:flex-row sm:justify-between sm:gap-6"
                >
                  <dt className="text-sm font-medium">{title}</dt>
                  <dd className="text-sm text-muted-foreground">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16" aria-labelledby="faq-title">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.6fr]">
            <div>
              <h2 id="faq-title" className="text-3xl font-semibold tracking-tight">
                Questions
              </h2>
              <p className="mt-3 text-muted-foreground">The short answers.</p>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {faqs.map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                      aria-hidden
                    />
                  </summary>
                  <p className="pb-4 pr-8 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Start your hisaab today</h2>
              <p className="mt-1.5 text-muted-foreground">
                Sign up with your email or Google. It takes under a minute.
              </p>
            </div>
            <Link href="/signup" className={buttonVariants({ size: 'lg' })}>
              Get started <ArrowRight />
            </Link>
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
