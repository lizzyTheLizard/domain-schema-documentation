import globals from 'globals'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import jsdoc from 'eslint-plugin-jsdoc'
import stylistic from '@stylistic/eslint-plugin'

export default [
  { ignores: ['**/dist/', '.yarn', '.pnp.*'] },
  { languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigDirName: import.meta.dirname,
    },
  },
  },
  eslint.configs.recommended,
  jsdoc.configs['flat/recommended-typescript'],
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  stylistic.configs.customize({ braceStyle: '1tbs' }),
  {
    name: 'Override some rules',
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'jsdoc/no-undefined-types': ['error'],
      'jsdoc/require-jsdoc': ['error', { publicOnly: true }],
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
    },
  },
  {
    name: 'Special rules for js files',
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { globals: globals.node, parserOptions: { project: null } },
  },
]
