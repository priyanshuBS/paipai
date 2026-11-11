// Shared ESLint flat config for all PaiPai workspaces.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/** @type {import('typescript-eslint').ConfigArray} */
export const base = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/drizzle/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  prettier,
);

export default base;
