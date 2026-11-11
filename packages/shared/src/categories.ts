/**
 * Default (system) categories. Icon names are lucide icon names, which are
 * available on web (lucide-react) and mobile (lucide-react-native).
 */
import type { TransactionType } from './schemas/common';

export interface DefaultCategory {
  /** Stable key so seeds are idempotent. */
  key: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  sortOrder: number;
}

export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultCategory[] = [
  { key: 'travel', name: 'Travel', icon: 'bus', color: '#7CC4FA' },
  { key: 'food', name: 'Food & Dining', icon: 'utensils', color: '#FFB38A' },
  { key: 'groceries', name: 'Groceries', icon: 'shopping-basket', color: '#9BE3A8' },
  { key: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: '#F7A8D8' },
  { key: 'bills', name: 'Bills & Utilities', icon: 'receipt', color: '#FFD66B' },
  { key: 'rent', name: 'Rent', icon: 'house', color: '#B9A6F7' },
  { key: 'health', name: 'Health', icon: 'heart-pulse', color: '#F59E9E' },
  { key: 'education', name: 'Education', icon: 'graduation-cap', color: '#A8D5FF' },
  { key: 'entertainment', name: 'Entertainment', icon: 'clapperboard', color: '#D3B8F2' },
  { key: 'fuel', name: 'Fuel', icon: 'fuel', color: '#F2C185' },
  { key: 'mobile', name: 'Mobile & Internet', icon: 'smartphone', color: '#7EDCD0' },
  { key: 'gifts', name: 'Gifts', icon: 'gift', color: '#FFC4A3' },
  { key: 'personal-care', name: 'Personal Care', icon: 'sparkles', color: '#C8E68A' },
  { key: 'other-expense', name: 'Other', icon: 'circle-ellipsis', color: '#BFC7D5' },
].map((c, i) => ({ ...c, type: 'expense' as const, sortOrder: i }));

export const DEFAULT_INCOME_CATEGORIES: readonly DefaultCategory[] = [
  { key: 'salary', name: 'Salary', icon: 'briefcase', color: '#9BE3A8' },
  { key: 'business', name: 'Business', icon: 'store', color: '#7CC4FA' },
  { key: 'freelance', name: 'Freelance', icon: 'laptop', color: '#B9A6F7' },
  { key: 'gift-income', name: 'Gift', icon: 'gift', color: '#FFC4A3' },
  { key: 'other-income', name: 'Other', icon: 'wallet', color: '#BFC7D5' },
].map((c, i) => ({ ...c, type: 'income' as const, sortOrder: i }));

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

/** Icons offered in the category icon picker. */
export const CATEGORY_ICON_CHOICES = [
  'bus',
  'car',
  'bike',
  'train-front',
  'plane',
  'fuel',
  'utensils',
  'coffee',
  'pizza',
  'shopping-basket',
  'shopping-bag',
  'shirt',
  'receipt',
  'house',
  'lightbulb',
  'droplet',
  'heart-pulse',
  'pill',
  'graduation-cap',
  'book-open',
  'clapperboard',
  'gamepad-2',
  'music',
  'smartphone',
  'wifi',
  'gift',
  'sparkles',
  'scissors',
  'dumbbell',
  'baby',
  'dog',
  'wrench',
  'briefcase',
  'store',
  'laptop',
  'wallet',
  'piggy-bank',
  'landmark',
  'hand-coins',
  'circle-ellipsis',
] as const;
