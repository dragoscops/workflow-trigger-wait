import { avaSpecJs, avaTestJs } from "../../constants";
import { CreateCommandOptions } from "../../types";
import { update as updatePackageJson } from "../create/package-json";
import writeTestFiles from "./write-test-files";

export default async function (
  options: CreateCommandOptions,
  spec = avaSpecJs,
  test = avaTestJs,
) {
  const { logger, testFramework } = options;
  logger?.verbose(`configuring ${testFramework}...`);

  await updatePackageJson(options, (object) => ({
    ...object,
    scripts: {
      ...(object as any).scripts,
      test: "cross-env NODE_ENV=test BUILD_ENV=node-cjs nyc ava",
      "test:watch": "npm run test -- --watch",
    },
  }));

  return writeTestFiles(options, test, spec);
}
