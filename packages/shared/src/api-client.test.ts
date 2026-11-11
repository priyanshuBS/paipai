import { describe, expect, it } from 'vitest';
import { toQueryString } from './api-client';

describe('toQueryString', () => {
  it('skips empty values and joins arrays', () => {
    expect(toQueryString({ a: 'x y', b: undefined, c: '', d: ['u', 'v'], e: [], f: 0 })).toBe(
      '?a=x%20y&d=u%2Cv&f=0',
    );
    expect(toQueryString({})).toBe('');
  });
});
