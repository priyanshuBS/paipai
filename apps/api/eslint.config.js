import base from '@paipai/config/eslint';

export default [
  ...base,
  {
    files: ['test/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
];
