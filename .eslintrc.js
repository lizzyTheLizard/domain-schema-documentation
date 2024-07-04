module.exports = {
  root: true,
  ignorePatterns: ['dist'],
  overrides: [
    {
      files: ['*.ts'],
      plugins: ['jsdoc'],
      extends: ['love', 'plugin:jsdoc/recommended-typescript'],
      rules: {
        '@typescript-eslint/strict-boolean-expressions': ['error', { allowNullableObject: true }],
        'jsdoc/no-undefined-types': ['error'],
        'jsdoc/require-jsdoc': ['error', { publicOnly: true }]
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname
      }
    },
    {
      files: ['*.js'],
      plugins: ['jsdoc'],
      extends: 'standard',
      rules: {
        'jsdoc/require-jsdoc': ['error', { publicOnly: true }]
      }
    }
  ]
}
