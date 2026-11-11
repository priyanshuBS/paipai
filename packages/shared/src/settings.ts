/** Options offered in Settings. */

export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AED', label: 'UAE Dirham (د.إ)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
  { code: 'NPR', label: 'Nepalese Rupee (रु)' },
  { code: 'BDT', label: 'Bangladeshi Taka (৳)' },
  { code: 'LKR', label: 'Sri Lankan Rupee (Rs)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
] as const;

/** Curated list (Hermes on mobile lacks Intl.supportedValuesOf). */
export const TIMEZONES = [
  { id: 'Asia/Kolkata', label: 'India (IST, UTC+5:30)' },
  { id: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { id: 'Asia/Kathmandu', label: 'Kathmandu (UTC+5:45)' },
  { id: 'Asia/Dhaka', label: 'Dhaka (UTC+6)' },
  { id: 'Asia/Colombo', label: 'Colombo (UTC+5:30)' },
  { id: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { id: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { id: 'Australia/Sydney', label: 'Sydney' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Berlin', label: 'Berlin / Paris' },
  { id: 'America/New_York', label: 'New York' },
  { id: 'America/Chicago', label: 'Chicago' },
  { id: 'America/Los_Angeles', label: 'Los Angeles' },
  { id: 'America/Toronto', label: 'Toronto' },
  { id: 'UTC', label: 'UTC' },
] as const;

/** Daily reminder default (24h "HH:mm" in the device's local time). */
export const DEFAULT_REMINDER_TIME = '21:00';

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;
export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];
