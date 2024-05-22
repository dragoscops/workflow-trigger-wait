/* eslint-disable max-lines-per-function */
import install from "../../default/create/install";
import { requiresSinon } from "../../util/test-framework";
import { CreateCommandOptions } from "../../types";

const buildPackageList = <T extends CreateCommandOptions>({
  qualityTools,
  testFramework,
  buildTool,
}: T): string[] => {
  return [
    `typescript`,
    "ts-node",
    "tslib",
    "@types/node",
    "@istanbuljs/nyc-config-typescript",
    // test framework specific
    ...(requiresSinon(testFramework) ? ["@types/sinon"] : []),
    ...(testFramework === "ava" ? ["tsimp"] : []),
    ...(testFramework === "jasmine"
      ? [
        "@babel/cli",
        "@babel/core",
        "@babel/preset-env",
        "@babel/register",
        "@babel/plugin-transform-typescript",
        "jasmine",
      ]
      : []),
    ...(testFramework === "jest" ? ["ts-jest", "@types/jest"] : []),
    ...(testFramework === "mocha" ? ["@types/chai", "@types/mocha"] : []),
    // quality tools specific
    ...(qualityTools.includes("eslint") ? ["typescript-eslint"] : []),
    // builder specific
    ...(buildTool === "esbuild" ? ["esbuild-plugin-babel"] : []),
    ...(buildTool === "rollup" ? ["@rollup/plugin-typescript"] : []),
  ];
};

export default async function <T extends CreateCommandOptions>(
  options: T,
): Promise<void> {
  await install(options);

  const { packageManager, logger } = options;

  logger?.verbose("Installing TypeScript dependencies...");

  const { install: pmInstall } = await import(
    `../../util/package-manager/${packageManager}`
  );
  return pmInstall(buildPackageList(options), {
    ...options,
    saveDev: true,
    // force: true,
  });
}
