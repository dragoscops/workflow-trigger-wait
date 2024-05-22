export default [
  {
    env: {
      browser: true,
      es6: true,
      node: true,
      mocha: true,
    },

    // uncomment for eslint rules
    extends: [
      "plugin:sonar/recommended",
      "plugin:sonarjs/recommended",
      "prettier",
    ],
    plugins: ["sonar", "sonarjs", "prettier"],
    root: true,
    rules: {
      "consistent-return": 2,
      "max-len": ["error", 120],
      "max-lines-per-function": ["error", 20],
      "max-params": ["error", 3],
      "no-else-return": 1,
      "sonar/no-invalid-await": 0,
      "space-unary-ops": 2,
      curly: ["error", "all"],
      indent: [1, 2],
      semi: [1, "always"],
    },
  },
];
