'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ApiError } from '@/lib/api';

function redirectToLogin(err: unknown) {
  if (err instanceof ApiError && err.status === 401 && typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/app')) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: redirectToLogin }),
        mutationCache: new MutationCache({ onError: redirectToLogin }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        {children}
        <Toaster
          position="bottom-center"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                'rounded-lg border border-border bg-surface text-foreground shadow-[var(--shadow-pop)]',
              description: 'text-muted-foreground',
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
