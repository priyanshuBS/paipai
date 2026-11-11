import Link from 'next/link';
import { LogoMark } from '@/components/brand';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <LogoMark className="size-14 text-forest dark:text-lime" />
      <h1 className="mt-6 text-3xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        This page doesn&apos;t exist, but your hisaab is safe.
      </p>
      <Link href="/app" className={buttonVariants({ className: 'mt-6' })}>
        Go to dashboard
      </Link>
    </main>
  );
}
