import { darkColors, lightColors, palette, type ThemeColors } from '@paipai/shared/tokens';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** "#B6E36B" -> "182 227 107" (channels, so Tailwind opacity modifiers work). */
function channels(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function vars(colors: Record<string, string>): string {
  return Object.entries(colors)
    .map(([k, val]) => `--pp-${kebab(k)}:${channels(val)};`)
    .join('');
}

const brand = {
  lime: palette.lime,
  limeLight: palette.limeLight,
  forest: palette.forest,
  forestMid: palette.forestMid,
};

/** Emits the shared design tokens as CSS variables (single source of truth: @paipai/shared). */
export function ThemeVars() {
  const light: ThemeColors = lightColors;
  const dark: ThemeColors = darkColors;
  const css =
    `:root{${vars(brand)}${vars({ ...light })}color-scheme:light;` +
    `--shadow-soft:0 1px 2px rgb(17 17 17/.04),0 8px 24px -12px rgb(17 17 17/.12);` +
    `--shadow-float:0 10px 30px -10px rgb(30 58 26/.35);--radius-card:22px}` +
    `.dark{${vars({ ...dark })}color-scheme:dark;` +
    `--shadow-soft:0 1px 2px rgb(0 0 0/.3),0 8px 24px -12px rgb(0 0 0/.5)}`;
  return <style id="pp-theme" dangerouslySetInnerHTML={{ __html: css }} />;
}
