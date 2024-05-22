import install from "../../default/create/install";
import { CreateCommandOptions } from "../../types";

const buildPackageList = <T extends CreateCommandOptions>({
  testFramework,
  buildTool,
}: T): string[] => {
  return [
    "@babel/cli",
    "@babel/core",
    "@babel/eslint-parser",
    "@babel/preset-env",
    "@babel/register",
    "@babel/plugin-transform-typescript",
    // test framework specific
    ...(testFramework === "ava" ? ["@ava/babel"] : []),
    ...(testFramework === "jest" ? ["babel-jest"] : []),
    // builder specific
    ...(buildTool === "esbuild" ? ["esbuild-plugin-babel"] : []),
    ...(buildTool === "rollup" ? ["@rollup/plugin-babel"] : []),
  ];
};

export default async function <T extends CreateCommandOptions>(
  options: T,
): Promise<void> {
  await install(options);

  const { packageManager, logger } = options;

  logger?.verbose("Installing babel dependencies...");

  const { install: pmInstall } = await import(
    `../../util/package-manager/${packageManager}`
  );
  return pmInstall(buildPackageList(options), {
    ...options,
    saveDev: true,
  });
}
