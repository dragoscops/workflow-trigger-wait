// .eslintrc.js

module.exports = {
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:sonarjs/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  plugins: ['@typescript-eslint', 'sonarjs', 'prettier', 'import'],
  overrides: [
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    '@typescript-eslint/object-curly-spacing': 'off',
    '@typescript-eslint/space-infix-ops': 'off',
    'consistent-return': 2,
    'max-len': ['error', 120],
    'max-lines-per-function': ['error', 60],
    'max-params': ['error', 5],
    'no-else-return': 1,
    'sonar/no-invalid-await': 0,
    'space-unary-ops': 2,
    curly: ['error', 'all'],
    // indent: [1, 2],
    semi: [1, 'always'],

    'import/no-unresolved': 'off',
  },
};
