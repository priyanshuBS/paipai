/** Length of the sign-in code sent by email. */
export const OTP_LENGTH = 6;

/**
 * Pull a 6-digit sign-in code out of pasted text: "482913", "482 913",
 * "Your code is 482-913", or the whole email body. Returns null when there
 * isn't exactly one candidate, so a phone number or amount is never guessed.
 */
export function extractOtp(text: string | null | undefined): string | null {
  if (!text) return null;
  const candidates = new Set<string>();
  // Grouped forms first ("482 913", "482-913"), then plain 6-digit runs.
  for (const m of text.matchAll(/(?<!\d)(\d{3})[\s-](\d{3})(?!\d)/g)) {
    candidates.add(`${m[1] ?? ''}${m[2] ?? ''}`);
  }
  for (const m of text.matchAll(/(?<!\d)(\d{6})(?!\d)/g)) candidates.add(m[1] ?? '');
  const [only, ...rest] = [...candidates];
  return only && rest.length === 0 ? only : null;
}
