// .babelrc.js

//  can be 'browser', 'node-cjs', 'node-esm'
const buildEnv = process.env.BUILD_ENV || "node-esm";

module.exports = function (api) {
  api.cache(true);

  const config = {
    plugins: ["@babel/plugin-transform-typescript"],
    presets: [
      [
        "@babel/preset-env",
        {
          targets:
            buildEnv !== "browser"
              ? {
                  // While this remains unchanged from the reference configuration, it's worth highlighting that
                  // targeting the current Node.js version ensures the output is optimized for that specific runtime
                  // environment, taking advantage of native support for ES11 features where available.
                  ...(buildEnv === "node-cjs" ? { node: "current" } : {}),
                  // Targets environments that support ES Modules.
                  ...(buildEnv === "node-esm" ? { esmodules: true } : {}),
                }
              : // The value "> 0.25%, not dead, last 2 versions" tells Babel to target browsers used by more than
                // 0.25% of global users, that are not "dead" (browsers without official support or updates for 24
                // months), and the last 2 versions of all browsers. This ensures your JavaScript code is transpiled
                // to be compatible with the vast majority of users' browsers. Adjust this string to fit the specific
                // needs and audience of your project.
                "> 0.25%, not dead, last 2 versions",
          // \`useBuildIns\` and \`corejs\` configure Babel to only include polyfills for features
          // used in your code that are missing in the target environment.
          // Will require core-js@3
          useBuiltIns: "usage",
          corejs: 3,
          // Tells Babel to transform ES modules (import/export) into CommonJS
          // (require/module.exports). This is the critical change for making your code compatible
          // with Node.js environments that only support CommonJS module syntax.
          ...(buildEnv === "node-cjs" && !process.env.ROLLUP_BUILD ? { modules: "commonjs" } : {}),
          ...(buildEnv === "node-esm" || buildEnv === "browser"
            ? {
                // Tells Babel not to transform modules - thus preserving import and export statements
                modules: false,
                // Ensures that Babel attempts to transpile all JavaScript features to comply with
                // specified target. This might not be strictly necessary for targeting ES11, but it's
                // a safety net to ensure compatibility.
                forceAllTransforms: true,
              }
            : {}),
        },
      ],
    ],
  };

  if (process.env.DEBUG) {
    console.log(".babelrc.js", JSON.stringify(config, null, 2));
  }
  return config;
};
