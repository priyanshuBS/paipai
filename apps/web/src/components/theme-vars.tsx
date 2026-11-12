import { darkColors, lightColors } from '@paipai/shared/tokens';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** "#2E5BDA" -> "46 91 218" (channels, so Tailwind opacity modifiers work). */
function channels(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function vars(colors: Record<string, string>): string {
  return Object.entries(colors)
    .map(([k, val]) => `--pp-${kebab(k)}:${channels(val)};`)
    .join('');
}

/** Emits the shared design tokens as CSS variables (single source of truth: @paipai/shared). */
export function ThemeVars() {
  const css =
    `:root{${vars({ ...lightColors })}color-scheme:light;--radius-card:16px;` +
    `--shadow-card:0 1px 2px rgb(11 16 32/.05),0 10px 28px -14px rgb(11 16 32/.14);` +
    `--shadow-pop:0 1px 2px rgb(11 16 32/.06),0 16px 40px -12px rgb(11 16 32/.22)}` +
    `.dark{${vars({ ...darkColors })}color-scheme:dark;` +
    `--shadow-card:0 1px 2px rgb(0 0 0/.3);` +
    `--shadow-pop:0 1px 2px rgb(0 0 0/.4),0 16px 40px -12px rgb(0 0 0/.7)}`;
  return <style id="pp-theme" dangerouslySetInnerHTML={{ __html: css }} />;
}
