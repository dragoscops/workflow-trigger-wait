// .prettierrc.js

module.exports = {
  "bracketSpacing": false,
  "overrides": [
    {
      "files": "*.json",
      "options": {
        "parser": "json",
        "singleQuote": false
      }
    },
    {
      "files": "*.json5",
      "options": {
        "parser": "json5",
        "singleQuote": false
      }
    },
    {
      "files": "*.js",
      "options": {
        "parser": "babel"
      }
    }
  ],
  "parser": "typescript",
  "printWidth": 120,
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all"
};