import readRepoFile from "../../util/read-repo-file";

import writeFile from "../../util/write-file";
import {
  PackageJsonOptions,
  update as updatePackageJson,
} from "../../default/create/package-json";
import { CreateCommandOptions, BuildTarget } from "../../types";
import {
  getBuildableTargets,
  hasBrowserBunOrDeno,
} from "../../default/targets";

export default async function (options: CreateCommandOptions) {
  const { testFramework, targets, logger, useDefaultCommands } = options;
  logger?.verbose(`configuring babel...`);

  const tsConfig = await readRepoFile("../../static/tsconfig.json", options);
  let tsConfigObject = JSON.parse(tsConfig);
  if (["jest", "mocha"].includes(testFramework)) {
    tsConfigObject = {
      ...tsConfigObject,
      compilerOptions: {
        ...(tsConfigObject?.compilerOptions ?? {}),
        types: [
          ...(tsConfigObject?.compilerOptions?.types ?? []),
          testFramework,
        ],
      },
    };
  }
  await writeFile(
    "tsconfig.json",
    JSON.stringify(tsConfigObject, null, 2),
    options,
  );

  for (const target of ["base", "types", ...getBuildableTargets(targets)]) {
    await readRepoFile(
      `../../static/tsconfig.${target.replace("node-", "")}.json`,
      options,
    ).then((tsConfig) =>
      writeFile(
        `tsconfig.${target.replace("node-", "")}.json`,
        tsConfig,
        options,
      ),
    );
  }

  // "build:browser-bundle":
  //   "esbuild --bundle dist/browser/index.js --format=esm --target=es2020 --outfile=dist/browser/index.bundle.js",
  // "build:browser-bundle-min":
  //   "esbuild --minify --bundle dist/browser/index.js --format=esm --target=es2020 --outfile=dist/browser/index.bundle.min.js",
  // "build:browser-umd":
  //   'rollup dist/browser/index.bundle.js --format umd --name "@templ-project/node-typescript" -o dist/browser/index.umd.js',
  // "build:browser-umd-min":
  //   'rollup dist/browser/index.bundle.min.js --compact --format umd --name "@templ-project/node-typescript" -o dist/browser/index.umd.min.js',
  return updatePackageJson(options, (packageObject: PackageJsonOptions) => ({
    ...packageObject,
    scripts: {
      ...packageObject.scripts,
      build: "run-s clean build:*",
      ...getBuildableTargets(targets)
        .map((target) => ({
          [`build:${target}`]: useDefaultCommands
            ? `tsc -p ./tsconfig.${target.replace("node-", "")}.json`
            : `create-node build --target ${target}`,
        }))
        .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
      "build:types": "tsc -p ./tsconfig.types.json",
    },
  }));
}
