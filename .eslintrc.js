module.exports = {
  root: true,
  ignorePatterns: ['dist'],
  overrides: [
    {
      files: ['*.ts'],
      extends: 'love',
      rules: {
        '@typescript-eslint/strict-boolean-expressions': ['error', { allowNullableObject: true }]
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname
      }
    },
    {
      files: ['*.js'],
      extends: 'standard'
    }
  ]
}
