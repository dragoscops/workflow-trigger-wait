const babel = require("@rollup/plugin-babel");
const commonjs = require("@rollup/plugin-commonjs");
const resolve = require("@rollup/plugin-node-resolve");

// Use `process.env.BUILD_ENV` to set the target
const buildTarget = process.env.BUILD_TARGET || "node-esm"; // Default to 'node-esm'

const babelConfig = require(`./.babelrc.${buildTarget.replace("node-", "")}`);

if (buildTarget === "node-cjs") {
  delete babelConfig.presets[0][1].modules;
}

module.exports = [
  {
    input: "src/index.js",
    output: {
      file: `dist/${buildTarget}/index.js`,
      format: buildTarget === "node-cjs" ? "cjs" : "es", // or 'umd' if you need browser and Node.js support
    },
    plugins: [
      resolve(), // resolves third-party modules in node_modules
      ...(buildTarget === "node-cjs" ? [commonjs()] : []), // convert .js CommonJS modules to ES6
      babel(babelConfig),
    ],
  },
];
