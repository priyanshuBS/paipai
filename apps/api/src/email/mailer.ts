import { Resend } from 'resend';
import { OTP_EXPIRES_IN_SECONDS } from '@paipai/shared/schemas';
import { logger } from '../lib/logger';
import { otpEmailHtml, otpEmailSubject, otpEmailText, type OtpPurpose } from './otp-template';

export interface Mailer {
  sendOtp(input: { email: string; otp: string; purpose: OtpPurpose }): Promise<void>;
}

export function createResendMailer(apiKey: string, from: string): Mailer {
  const resend = new Resend(apiKey);
  const minutes = Math.round(OTP_EXPIRES_IN_SECONDS / 60);
  return {
    async sendOtp({ email, otp }) {
      const { error } = await resend.emails.send({
        from,
        to: email,
        subject: otpEmailSubject(otp),
        html: otpEmailHtml(otp, minutes),
        text: otpEmailText(otp, minutes),
      });
      if (error) {
        logger.error('email.send_failed', {
          provider: 'resend',
          name: error.name,
          message: error.message,
        });
        throw new Error('Could not send the verification email. Please try again.');
      }
    },
  };
}

/** Development fallback when RESEND_API_KEY is not set: prints the OTP to the server log. */
export function createConsoleMailer(): Mailer {
  return {
    async sendOtp({ email, otp, purpose }) {
      logger.info('email.dev_otp', { email, otp, purpose });
    },
  };
}

/** Test helper: records the last OTP per email. */
export function createMemoryMailer(): Mailer & { last(email: string): string | undefined } {
  const sent = new Map<string, string>();
  return {
    async sendOtp({ email, otp }) {
      sent.set(email.toLowerCase(), otp);
    },
    last: (email) => sent.get(email.toLowerCase()),
  };
}
