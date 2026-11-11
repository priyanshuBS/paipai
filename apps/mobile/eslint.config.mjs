import base from '@paipai/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...base,
  { ignores: ['dist/**', '.expo/**', 'babel.config.js', 'metro.config.js', 'tailwind.config.js'] },
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
