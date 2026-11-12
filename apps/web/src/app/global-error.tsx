'use client';

/** Last-resort boundary for errors in the root layout itself (no app styles are guaranteed here). */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#F7F6F3',
          color: '#0B1020',
          textAlign: 'center',
          padding: 16,
        }}
      >
        <main>
          <h1 style={{ fontSize: 28, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#71717A' }}>Your data is safe. Please try again.</p>
          <button
            onClick={reset}
            style={{
              marginTop: 12,
              border: 0,
              borderRadius: 8,
              padding: '10px 18px',
              fontWeight: 600,
              background: '#0B1020',
              color: '#FAFAFA',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
