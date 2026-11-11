import { ImageResponse } from 'next/og';

export const alt = 'PaiPai — Paai-paai ka hisaab';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function Mark({ s }: { s: number }) {
  const u = s / 32;
  const sq = (x: number, y: number, r: number, o = 1) => (
    <div
      style={{
        position: 'absolute',
        left: x * u,
        top: y * u,
        width: 12 * u,
        height: 12 * u,
        borderRadius: r * u,
        background: '#1E3A1A',
        opacity: o,
      }}
    />
  );
  return (
    <div style={{ position: 'relative', width: s, height: s, display: 'flex' }}>
      {sq(3, 3, 3.5)}
      {sq(17, 3, 3.5)}
      {sq(3, 17, 3.5)}
      {sq(17, 17, 6, 0.28)}
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
        background: '#B6E36B',
        padding: 72,
        color: '#1E3A1A',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Mark s={72} />
        <div style={{ fontSize: 52, fontWeight: 800 }}>PaiPai</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>
          Track your spending effortlessly
        </div>
        <div style={{ fontSize: 36, marginTop: 24, opacity: 0.8 }}>Paai-paai ka hisaab · in ₹</div>
      </div>
    </div>,
    size,
  );
}
