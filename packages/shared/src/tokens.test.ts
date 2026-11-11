import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './categories';
import { chartColorFor, chartPalette } from './tokens';

describe('chartColorFor', () => {
  it('maps every default category pastel to a validated chart slot', () => {
    for (const c of DEFAULT_CATEGORIES) {
      const color = chartColorFor(c.color);
      expect([...chartPalette.light, chartPalette.neutral.light]).toContain(color);
    }
  });

  it('is stable per colour and handles greys / invalid input', () => {
    expect(chartColorFor('#7CC4FA')).toBe('#2a78d6'); // sky -> blue
    expect(chartColorFor('#FFB38A')).toBe('#eb6834'); // peach -> orange
    expect(chartColorFor('#BFC7D5')).toBe(chartPalette.neutral.light); // slate -> neutral
    expect(chartColorFor(null, 'dark')).toBe(chartPalette.neutral.dark);
  });
});
