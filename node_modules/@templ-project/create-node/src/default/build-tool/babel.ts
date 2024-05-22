import readRepoFile from "../../util/read-repo-file";
import writeFile from "../../util/write-file";
import {
  PackageJsonOptions,
  update as updatePackageJson,
} from "../../default/create/package-json";
import { CreateCommandOptions, BuildTarget } from "../../types";
import { getBuildableTargets } from "../targets";
import { generateBuildCommand } from ".";

export const babelConfig = {
  plugins: ["@babel/plugin-transform-typescript"],
  presets: [["@babel/preset-env"]],
};

export const babelConfigBrowser = {
  ...babelConfig,
  presets: [
    [
      ...babelConfig.presets[0],
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

export const babelConfigCjs = {
  ...babelConfig,
  presets: [
    [
      ...babelConfig.presets[0],
      {
        targets: { node: "current" },
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

export const babelConfigEsm = {
  ...babelConfig,
  presets: [
    [
      ...babelConfig.presets[0],
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

export const getTargetedBabelRcName = (target: BuildTarget) =>
  `.babelrc.${target.replace("node-", "")}.js`;

const updatePackageJsonScripts =
  ({ targets, useDefaultCommands }: CreateCommandOptions) =>
    (packageObject: PackageJsonOptions) => ({
      ...packageObject,
      scripts: {
        ...packageObject.scripts,
        build: "run-s clean build:*",
        ...getBuildableTargets(targets)
          .map((target: BuildTarget) => ({
            [`build:${target}`]: useDefaultCommands
              ? `babel src --config-file ./.babelrc.${target.replace(
                "node-",
                "",
              )}.js --out-dir dist/${target} --extensions ".js"`
              : generateBuildCommand({
                target,
                buildTool: "babel",
              }),
          }))
          .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
      },
    });

export default async function (options: CreateCommandOptions) {
  const { buildTool, logger, targets } = options;
  logger?.verbose(`configuring (js) ${buildTool}...`);

  for (const target of ["base", ...getBuildableTargets(targets)]) {
    const fileName = getTargetedBabelRcName(target as BuildTarget);
    await readRepoFile(`../../static/${fileName.slice(1)}`, options).then(
      (config) => writeFile(fileName, config, options),
    );
  }

  await readRepoFile(`../../static/babelrc.js`, options).then((config) =>
    writeFile(".babelrc.js", config, options),
  );

  return updatePackageJson(options, updatePackageJsonScripts(options));
}
