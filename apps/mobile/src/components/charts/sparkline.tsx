import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(pts: [number, number][]): string {
  const first = pts[0];
  if (!first) return '';
  let d = `M${first[0]},${first[1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) continue;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Brand-coloured area sparkline for the hero card. */
export function Sparkline({
  values,
  color,
  ring,
  height = 96,
  label,
}: {
  values: number[];
  color: string;
  /** Colour behind the end dot (the card background). */
  ring: string;
  height?: number;
  label: string;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));
  const pad = 6;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts: [number, number][] = values.map((v, i) => [
    i * step,
    height - pad - (v / max) * (height - pad * 2),
  ]);
  const line = smoothPath(pts);
  const last = pts.at(-1);

  return (
    <View onLayout={onLayout} style={{ height }} accessible accessibilityLabel={label}>
      {w > 0 && values.length > 1 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${line} L${w},${height} L0,${height} Z`} fill="url(#spark)" />
          <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          {last && (
            <Circle
              cx={last[0]}
              cy={last[1]}
              r={4.5}
              fill={color}
              stroke={ring}
              strokeWidth={2.5}
            />
          )}
        </Svg>
      )}
    </View>
  );
}
