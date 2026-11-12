'use client';

import { Button } from '@/components/ui/button';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center"
    >
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        We couldn&apos;t load this screen. Please try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
