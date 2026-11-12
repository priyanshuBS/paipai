import { describe, expect, it } from 'vitest';
import { extractOtp } from './otp';

describe('extractOtp', () => {
  it('accepts plain, spaced and dashed codes', () => {
    expect(extractOtp('482913')).toBe('482913');
    expect(extractOtp('  482 913 ')).toBe('482913');
    expect(extractOtp('482-913')).toBe('482913');
  });

  it('finds the code inside a sentence or email body', () => {
    expect(extractOtp('Your PaiPai code is 482913. It expires in 10 minutes.')).toBe('482913');
    expect(extractOtp('482913 is your PaiPai code')).toBe('482913');
  });

  it('refuses ambiguous or non-code text', () => {
    expect(extractOtp(null)).toBeNull();
    expect(extractOtp('')).toBeNull();
    expect(extractOtp('12345')).toBeNull();
    expect(extractOtp('call 9876543210')).toBeNull(); // 10-digit phone number
    expect(extractOtp('codes 111111 and 222222')).toBeNull();
    expect(extractOtp('₹1,23,456')).toBeNull();
  });
});
