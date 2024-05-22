// .babelrc.js

const babelrc = require("./.babelrc.base");

module.exports = {
  ...babelrc,
  presets: [
    [
      ...babelrc.presets[0],
      {
        // The value "> 0.25%, not dead, last 2 versions" tells Babel to target browsers used by more than
        // 0.25% of global users, that are not "dead" (browsers without official support or updates for 24
        // months), and the last 2 versions of all browsers. This ensures your JavaScript code is transpiled
        // to be compatible with the vast majority of users' browsers. Adjust this string to fit the specific
        // needs and audience of your project.
        targets: "> 0.25%, not dead, last 2 versions",
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
