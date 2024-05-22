// .babelrc.js

const babelrc = require("./.babelrc.base");

module.exports = {
  ...babelrc,
  presets: [
    [
      ...babelrc.presets[0],
      {
        targets: { node: "16" },
        // `useBuildIns` and `corejs` configure Babel to only include polyfills for features
        // used in your code that are missing in the target environment.
        // Will require core-js@3
        useBuiltIns: "usage",
        corejs: 3,
        // Tells Babel to transform ES modules (import/export) into CommonJS
        // (require/module.exports). This is the critical change for making your code compatible
        // with Node.js environments that only support CommonJS module syntax.
        modules: "commonjs",
      },
    ],
  ],
};
