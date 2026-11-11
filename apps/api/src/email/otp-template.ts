import { brand, lightColors, palette } from '@paipai/shared/tokens';

export type OtpPurpose = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );

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

/** Branded, email-client-safe (table layout, inline styles) OTP email. */
export function otpEmailHtml(otp: string, expiresInMinutes: number): string {
  const digits = escapeHtml(otp)
    .split('')
    .map(
      (d) =>
        `<td style="padding:0 4px"><div style="width:44px;height:56px;line-height:56px;border-radius:14px;background:${palette.limeLight};color:${palette.forest};font-size:28px;font-weight:700;text-align:center;font-family:Inter,Segoe UI,Arial,sans-serif">${d}</div></td>`,
    )
    .join('');

  const logo = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
      <td style="vertical-align:middle">
        <table role="presentation" cellpadding="0" cellspacing="3"><tr>
          <td style="width:14px;height:14px;background:${palette.forest};border-radius:4px"></td>
          <td style="width:14px;height:14px;background:${palette.forest};border-radius:4px"></td>
        </tr><tr>
          <td style="width:14px;height:14px;background:${palette.forest};border-radius:4px"></td>
          <td style="width:14px;height:14px"></td>
        </tr></table>
      </td>
      <td style="vertical-align:middle;padding-left:8px;font-size:22px;font-weight:800;color:${palette.forest};font-family:Inter,Segoe UI,Arial,sans-serif">${brand.name}</td>
    </tr></table>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(otpEmailSubject(otp))}</title>
</head>
<body style="margin:0;padding:0;background:${lightColors.background};font-family:Inter,Segoe UI,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">Your code is ${escapeHtml(otp)}. It expires in ${expiresInMinutes} minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${lightColors.background};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
        <tr><td style="background:${palette.lime};border-radius:24px 24px 0 0;padding:28px 24px">${logo}</td></tr>
        <tr><td style="background:#ffffff;border-radius:0 0 24px 24px;padding:32px 28px;text-align:center">
          <h1 style="margin:0 0 8px;font-size:22px;color:${lightColors.text}">Your verification code</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:22px;color:${lightColors.textSecondary}">Enter this code in PaiPai to continue. It expires in <strong>${expiresInMinutes} minutes</strong>.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px"><tr>${digits}</tr></table>
          <p style="margin:0;font-size:13px;line-height:20px;color:${lightColors.textSecondary}">Didn't request this? You can safely ignore this email — someone may have typed your address by mistake.</p>
        </td></tr>
        <tr><td style="padding:20px 8px;text-align:center;font-size:12px;color:${lightColors.textSecondary}">${brand.name} · <em>${brand.tagline}</em></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
