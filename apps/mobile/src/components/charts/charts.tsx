import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { formatINR } from '@paipai/shared/money';
import { chartColorFor, chartPalette, palette } from '@paipai/shared/tokens';
import { useTheme } from '@/theme/theme';
import { Text } from '../ui';
import { arcPath, monotonePath, niceMax } from './geometry';

export interface ChartPoint {
  key: string;
  label: string;
  fullLabel?: string;
  value: number;
  count?: number;
}

function useChartColors() {
  const { dark, colors } = useTheme();
  return {
    dark,
    mode: (dark ? 'dark' : 'light') as 'light' | 'dark',
    surface: colors.surface,
    grid: colors.border,
    axis: colors.textSecondary,
    line: dark ? palette.lime : palette.forestMid,
    fill: palette.lime,
    bar: dark ? palette.forestMid : palette.lime,
    barActive: dark ? palette.lime : palette.forest,
    tipBg: dark ? palette.lime : '#111111',
    tipText: dark ? palette.forest : '#FFFFFF',
    neutral: chartPalette.neutral[dark ? 'dark' : 'light'],
  };
}

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

/** Accessible summary so the data is never visual-only. */
function summary(data: ChartPoint[]) {
  return (
    data
      .filter((d) => d.value > 0)
      .map((d) => `${d.fullLabel ?? d.label}: ${formatINR(d.value)}`)
      .join(', ') || 'No spending in this period'
  );
}

function TooltipPill({ point, x, width }: { point: ChartPoint; x: number; width: number }) {
  const c = useChartColors();
  const left = Math.max(0, Math.min(width - 150, x - 75));
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -4, left, width: 150, alignItems: 'center' }}
    >
      <View
        style={{
          backgroundColor: c.tipBg,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}
      >
        <Text weight="semibold" className="text-xs" style={{ color: c.tipText }} numberOfLines={1}>
          {point.fullLabel ?? point.label} · {formatINR(point.value)}
        </Text>
      </View>
    </View>
  );
}

/** Smooth area chart: lime gradient fading to transparent, tap to inspect a point. */
export function AreaChart({ data, height = 190 }: { data: ChartPoint[]; height?: number }) {
  const c = useChartColors();
  const [width, onLayout] = useWidth();
  const peak = data.reduce((m, p, i) => (p.value > (data[m]?.value ?? -1) ? i : m), 0);
  const [selected, setSelected] = useState<number | null>(null);
  const active = selected ?? peak;

  const padTop = 30;
  const padBottom = 22;
  const plotH = height - padTop - padBottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data.map((d, i) => ({
    x: data.length > 1 ? i * step : width / 2,
    y: padTop + plotH - (d.value / max) * plotH,
  }));
  const line = monotonePath(pts);
  const area = pts.length
    ? `${line} L${pts.at(-1)?.x},${padTop + plotH} L${pts[0]?.x},${padTop + plotH} Z`
    : '';
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const activePt = pts[active];
  const activeData = data[active];

  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Spending over time. ${summary(data)}`}
    >
      {width > 0 && (
        <Pressable
          onPress={(e) => {
            if (!step) return;
            const i = Math.round(e.nativeEvent.locationX / step);
            setSelected(Math.max(0, Math.min(data.length - 1, i)));
          }}
        >
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="ppArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.fill} stopOpacity={c.dark ? 0.35 : 0.65} />
                <Stop offset="1" stopColor={c.fill} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0, 0.5, 1].map((t) => (
              <Line
                key={t}
                x1={0}
                x2={width}
                y1={padTop + plotH * t}
                y2={padTop + plotH * t}
                stroke={c.grid}
                strokeDasharray="3 6"
              />
            ))}
            <Path d={area} fill="url(#ppArea)" />
            <Path d={line} stroke={c.line} strokeWidth={2} fill="none" />
            {activePt && activeData && activeData.value > 0 && (
              <>
                <Line
                  x1={activePt.x}
                  x2={activePt.x}
                  y1={padTop}
                  y2={padTop + plotH}
                  stroke={c.line}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <Circle
                  cx={activePt.x}
                  cy={activePt.y}
                  r={6}
                  fill={c.barActive}
                  stroke={c.surface}
                  strokeWidth={2}
                />
              </>
            )}
            {data.map((d, i) =>
              i % labelEvery === 0 || i === data.length - 1 ? (
                <SvgText
                  key={d.key}
                  x={Math.min(width - 14, Math.max(14, pts[i]?.x ?? 0))}
                  y={height - 4}
                  fontSize={11}
                  fill={c.axis}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              ) : null,
            )}
          </Svg>
        </Pressable>
      )}
      {width > 0 && activePt && activeData && activeData.value > 0 && (
        <TooltipPill point={activeData} x={activePt.x} width={width} />
      )}
    </View>
  );
}

/** Bars with rounded ends; the highlighted (selected/peak) bar is dark green. */
export function BarChart({
  data,
  highlightKey,
  height = 170,
}: {
  data: ChartPoint[];
  highlightKey?: string;
  height?: number;
}) {
  const c = useChartColors();
  const [width, onLayout] = useWidth();
  const [selected, setSelected] = useState<string | null>(null);
  const peakKey = data.reduce(
    (m, p) => (p.value > m.value ? p : m),
    data[0] ?? { key: '', value: -1 },
  ).key;
  const activeKey = selected ?? highlightKey ?? peakKey;

  const padTop = 30;
  const padBottom = 20;
  const plotH = height - padTop - padBottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const slot = data.length ? width / data.length : 0;
  const barW = Math.max(4, Math.min(28, slot * 0.6));
  const activeIndex = data.findIndex((d) => d.key === activeKey);
  const active = data[activeIndex];
  const labelEvery = data.length > 12 ? 6 : 1;

  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary(data)}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(3, (d.value / max) * plotH) : 3;
            const x = i * slot + (slot - barW) / 2;
            const isActive = d.key === activeKey;
            return (
              <G key={d.key} onPress={() => setSelected(d.key)}>
                <Rect x={i * slot} y={0} width={slot} height={height} fill="transparent" />
                <Rect
                  x={x}
                  y={padTop + plotH - h}
                  width={barW}
                  height={h}
                  rx={Math.min(4, barW / 2)}
                  fill={isActive && d.value > 0 ? c.barActive : c.bar}
                />
                {(i % labelEvery === 0 || isActive) && (
                  <SvgText
                    x={i * slot + slot / 2}
                    y={height - 4}
                    fontSize={11}
                    fill={c.axis}
                    textAnchor="middle"
                  >
                    {d.label}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      )}
      {width > 0 && active && active.value > 0 && (
        <TooltipPill point={active} x={activeIndex * slot + slot / 2} width={width} />
      )}
    </View>
  );
}

export interface DonutSlice {
  id: string;
  name: string;
  value: number;
  percent: number;
  color: string | null;
}

/** Top-5 + Other donut with surface gaps; colour follows each category. */
export function Donut({
  slices,
  total,
  size = 180,
}: {
  slices: DonutSlice[];
  total: number;
  size?: number;
}) {
  const c = useChartColors();
  const r = size / 2;
  const gap = slices.length > 1 ? 0.03 : 0;
  let angle = 0;
  const sum = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Category split. ${slices.map((s) => `${s.name} ${s.percent}%`).join(', ')}`}
    >
      <Svg width={size} height={size}>
        {slices.map((s) => {
          const sweep = (s.value / sum) * Math.PI * 2;
          const a0 = angle + gap / 2;
          const a1 = angle + sweep - gap / 2;
          angle += sweep;
          return (
            <Path
              key={s.id}
              d={arcPath(r, r, r - 2, r * 0.64, a0, Math.max(a0 + 0.01, a1))}
              fill={s.id === 'other' ? c.neutral : chartColorFor(s.color, c.mode)}
            />
          );
        })}
      </Svg>
      <View
        style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
        pointerEvents="none"
      >
        <Text muted className="text-xs">
          Total
        </Text>
        <Text weight="semibold" className="text-base" style={{ fontVariant: ['tabular-nums'] }}>
          {formatINR(total)}
        </Text>
      </View>
    </View>
  );
}

/** Horizontal share bars (payment methods). */
export function ShareBars({
  rows,
}: {
  rows: { key: string; label: string; value: number; percent: number }[];
}) {
  const c = useChartColors();
  return (
    <View className="gap-3">
      {rows.map((r, i) => (
        <View
          key={r.key}
          accessible
          accessibilityLabel={`${r.label}: ${formatINR(r.value)}, ${r.percent}%`}
        >
          <View className="flex-row items-baseline justify-between">
            <Text weight="medium" className="text-sm">
              {r.label}
            </Text>
            <Text muted className="text-sm">
              <Text weight="semibold" className="text-sm">
                {formatINR(r.value)}
              </Text>{' '}
              · {r.percent}%
            </Text>
          </View>
          <View className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-muted">
            <View
              style={{
                width: `${Math.max(r.percent, 2)}%`,
                height: '100%',
                borderRadius: 999,
                backgroundColor: i === 0 ? c.barActive : c.line,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
