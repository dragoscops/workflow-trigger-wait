// rollup.config.js

const typescript = require("@rollup/plugin-typescript");
const commonjs = require("@rollup/plugin-commonjs");
const resolve = require("@rollup/plugin-node-resolve");

// Use `process.env.BUILD_ENV` to set the environment
const buildTarget = process.env.BUILD_TARGET || "node-esm"; // Default to 'node-esm'

module.exports = [
  {
    input: "src/index.ts",
    output: {
      file: `dist/${buildTarget}/index.js`,
      format: buildTarget === "node-cjs" ? "cjs" : "es", // or 'umd' if you need browser and Node.js support
    },
    plugins: [
      typescript(),
      resolve(),
      ...(buildTarget === "node-cjs" ? [commonjs()] : []),
    ],
  },
];
