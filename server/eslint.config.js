import js from '@eslint/js';
import globals from 'globals';

/**
 * ESLint flat config for the server. Default export is required by ESLint (allowed exception in AGENTS.md §12.3).
 */
export default [
  { ignores: ['node_modules'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: ['block-like', 'multiline-const', 'multiline-expression', 'return'],
        },
        {
          blankLine: 'always',
          prev: ['block-like', 'multiline-const', 'multiline-expression'],
          next: '*',
        },
        { blankLine: 'always', prev: ['const', 'let'], next: '*' },
        {
          blankLine: 'any',
          prev: ['singleline-const', 'singleline-let'],
          next: ['singleline-const', 'singleline-let'],
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports only (AGENTS.md §12.3).',
        },
      ],
    },
  },
  {
    files: ['knexfile.js', 'eslint.config.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
];
