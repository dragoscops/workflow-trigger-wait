// .babelrc.js

const babelrc = require("./.babelrc.base");

module.exports = {
  ...babelrc,
  presets: [
    [
      ...babelrc.presets[0],
      {
        targets: { esmodules: true },
        // `useBuildIns` and `corejs` configure Babel to only include polyfills for features
        // used in your code that are missing in the target environment.
        // Will require core-js@3
        useBuiltIns: "usage",
        corejs: 3,
        // Tells Babel not to transform modules - thus preserving import and export statements
        modules: false,
        // Ensures that Babel attempts to transpile all JavaScript features to comply with
        // specified target. This might not be strictly necessary for targeting ES11, but it's
        // a safety net to ensure compatibility.
        forceAllTransforms: true,
      },
    ],
  ],
};
