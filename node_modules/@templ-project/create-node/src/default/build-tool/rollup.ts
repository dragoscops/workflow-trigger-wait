import { update as updatePackageJson } from "../create/package-json";
import readRepoFile from "../../util/read-repo-file";
import writeFile from "../../util/write-file";
import { BuildTarget, CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  const { language, targets, logger, buildTool } = options;
  logger?.verbose(`configuring ${buildTool}...`);

  await readRepoFile(`../../static/${language}/rollup.config.js`, options).then(
    (rollupConfig) => writeFile("rollup.config.js", rollupConfig, options),
  );

  return updatePackageJson(options, (packageObject) => ({
    ...packageObject,
    scripts: {
      ...packageObject.scripts,
      build: "run-s clean build:*",
      ...((["browser", "bun", "deno"] as BuildTarget[])
        .map((item) => targets?.includes(item))
        .reduce((acc, cur) => acc || cur, false)
        ? {
          "build:browser": "cross-env BUILD_TARGET=browser rollup -c",
        }
        : {}),
      ...(targets?.includes("node-cjs")
        ? {
          "build:node-cjs":
              "cross-env BUILD_TARGET=node-cjs ROLLUP_BUILD=1 rollup -c",
        }
        : {}),
      ...(targets?.includes("node-esm")
        ? { "build:node-esm": "cross-env BUILD_TARGET=node-esm rollup -c" }
        : {}),
    },
  }));
}
