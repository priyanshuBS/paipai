import { ImageResponse } from 'next/og';

export const alt = 'PaiPai: every rupee, accounted for';
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
        borderRadius: 7 * u,
        background: '#F26B1D',
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
          background: '#0B1020',
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
          background: '#0B1020',
          opacity: 0.55,
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
        background: '#0B1020',
        backgroundImage:
          'radial-gradient(60% 70% at 85% 0%, rgba(242,107,29,0.35), transparent 70%)',
        padding: 80,
        color: '#F7F6F3',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Mark s={56} />
        <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>PaiPai</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 26, color: '#F26B1D', fontWeight: 600 }}>
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
          Every rupee, accounted for.
        </div>
        <div style={{ fontSize: 30, marginTop: 28, color: '#9AA1B9' }}>
          Web · Android · iOS · in ₹
        </div>
      </div>
    </div>,
    size,
  );
}
