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
          background: '#F7F8F5',
          color: '#1E3A1A',
          textAlign: 'center',
          padding: 16,
        }}
      >
        <main>
          <h1 style={{ fontSize: 28, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#5B6B57' }}>Your data is safe. Please try again.</p>
          <button
            onClick={reset}
            style={{
              marginTop: 12,
              border: 0,
              borderRadius: 999,
              padding: '12px 24px',
              fontWeight: 700,
              background: '#B6E36B',
              color: '#1E3A1A',
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
