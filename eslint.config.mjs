import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    ignores: ['**/dist', '**/lib', 'node_modules/', '**/.eslintrc.cjs'],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.browser,
    },
  },
  {
    rules: {
      'no-console': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-unused-vars': ['error'],
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      'id-length': ['error', { exceptions: ['_'] }],
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      'class-methods-use-this': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      eqeqeq: ['error', 'always'],
    },
  },
);
