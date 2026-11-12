import { brand, lightColors, palette } from '@paipai/shared/tokens';

export type OtpPurpose = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );

const FONT = 'Inter,Segoe UI,Arial,sans-serif';

export function otpEmailSubject(otp: string): string {
  return `${otp} is your PaiPai code`;
}

export function otpEmailText(otp: string, expiresInMinutes: number): string {
  return [
    `Your PaiPai verification code is: ${otp}`,
    '',
    `It expires in ${expiresInMinutes} minutes. If you didn't request this, you can ignore this email.`,
    '',
    `${brand.name} — ${brand.tagline}`,
  ].join('\n');
}

/** Quiet, email-client-safe (table layout, inline styles) OTP email. */
export function otpEmailHtml(otp: string, expiresInMinutes: number): string {
  const c = lightColors;
  const digits = escapeHtml(otp)
    .split('')
    .map(
      (d) =>
        `<td style="padding:0 3px"><div style="width:42px;height:52px;line-height:52px;border-radius:8px;border:1px solid ${c.border};background:${c.surfaceMuted};color:${c.text};font-size:24px;font-weight:600;text-align:center;font-family:${FONT}">${d}</div></td>`,
    )
    .join('');

  // Mark: ink tile with two ledger bars (same as the app icon).
  const logo = `
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:28px;height:28px;background:${palette.ink};border-radius:7px"><tr>
          <td style="padding:8px 7px 0;line-height:0"><div style="width:14px;height:3px;background:#FAFAFA;border-radius:2px"></div></td>
        </tr><tr>
          <td style="padding:5px 7px 9px;line-height:0"><div style="width:8px;height:3px;background:#A1A1AA;border-radius:2px"></div></td>
        </tr></table>
      </td>
      <td style="vertical-align:middle;padding-left:10px;font-size:18px;font-weight:600;letter-spacing:-0.3px;color:${palette.ink};font-family:${FONT}">${brand.name}</td>
    </tr></table>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(otpEmailSubject(otp))}</title>
</head>
<body style="margin:0;padding:0;background:${c.background};font-family:${FONT}">
  <div style="display:none;max-height:0;overflow:hidden">Your code is ${escapeHtml(otp)}. It expires in ${expiresInMinutes} minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.background};padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px">
        <tr><td style="padding:0 4px 20px">${logo}</td></tr>
        <tr><td style="background:#ffffff;border:1px solid ${c.border};border-radius:12px;padding:32px 28px">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;letter-spacing:-0.3px;color:${c.text}">Your sign-in code</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:22px;color:${c.textSecondary}">Enter this code in PaiPai to continue. It expires in ${expiresInMinutes} minutes.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr>${digits}</tr></table>
          <p style="margin:0;padding-top:20px;border-top:1px solid ${c.border};font-size:13px;line-height:20px;color:${c.textSecondary}">Didn't request this? You can ignore this email. Someone may have typed your address by mistake.</p>
        </td></tr>
        <tr><td style="padding:20px 4px;font-size:12px;color:${c.textSecondary}">${brand.name} · ${brand.tagline}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
