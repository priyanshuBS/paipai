import { z } from 'zod';
import { amountPaiseSchema, currencySchema, themePreferenceSchema, timezoneSchema } from './common';

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Please enter your full name')
  .max(80, 'Name is too long');

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));

export const otpSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const OTP_LENGTH = 6;
export const OTP_EXPIRES_IN_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const updateMeSchema = z
  .object({
    name: nameSchema,
    image: z.url().nullable(),
    currency: currencySchema,
    timezone: timezoneSchema,
    monthlyBudget: amountPaiseSchema.nullable(),
    theme: themePreferenceSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const meSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  currency: z.string(),
  timezone: z.string(),
  monthlyBudget: z.number().int().nullable(),
  theme: themePreferenceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Me = z.infer<typeof meSchema>;
