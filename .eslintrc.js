module.exports = {
  root: true,
  ignorePatterns: ["dist"],
  overrides: [
    {
      files: ['*.ts'],
      extends: 'love',
      rules: {
        '@typescript-eslint/strict-boolean-expressions': ['error', { allowNullableObject: true }]
      }
    },
    {
      files: ['*.js'],
      extends: 'standard'
    }
  ]
}
