import { ImageResponse } from 'next/og';

export const alt = 'PaiPai: know where every rupee goes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function Mark({ s }: { s: number }) {
  const u = s / 24;
  return (
    <div
      style={{
        position: 'relative',
        width: s,
        height: s,
        borderRadius: 6 * u,
        background: '#18181B',
        display: 'flex',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 6 * u,
          top: 7 * u,
          width: 12 * u,
          height: 3 * u,
          borderRadius: 1.5 * u,
          background: '#FAFAFA',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 6 * u,
          top: 14 * u,
          width: 7 * u,
          height: 3 * u,
          borderRadius: 1.5 * u,
          background: '#FAFAFA',
          opacity: 0.6,
        }}
      />
    </div>
  );
}

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#FAFAFA',
        padding: 80,
        color: '#09090B',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Mark s={56} />
        <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>PaiPai</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 26, color: '#2E5BDA', fontWeight: 600 }}>
          Expense tracking for India
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 600,
            lineHeight: 1.08,
            letterSpacing: -2.5,
            marginTop: 18,
            maxWidth: 950,
          }}
        >
          Know where every rupee goes.
        </div>
        <div style={{ fontSize: 30, marginTop: 28, color: '#71717A' }}>
          Web · Android · iOS · in ₹
        </div>
      </div>
    </div>,
    size,
  );
}
