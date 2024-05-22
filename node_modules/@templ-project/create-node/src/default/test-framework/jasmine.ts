import writeFile from "../../util/write-file";
import { update as updatePackageJson } from "../../default/create/package-json";
import { CreateCommandOptions, ProgrammingLanguage } from "../../types";

import writeTestFiles from "./write-test-files";
import { jasmineSpecJs, jasmineTestJs } from "../../constants";

export type JasmineConfig = {
  spec_dir: string[];
  spec_files: string[];
  helpers: string[];
  stopSpecOnExpectationFailure: boolean;
  random: boolean;
  [key: string]: any;
};

export const jasmineConfig = (
  language: ProgrammingLanguage,
): JasmineConfig => ({
  spec_dir: ["."],
  spec_files: [`src/**/*.spec.${language}`, `test/**/*.test.${language}`],
  helpers: [".jasmine/*.js"],
  stopSpecOnExpectationFailure: false,
  random: false,
});

export default async function (
  options: CreateCommandOptions,
  config?: JasmineConfig,
  spec = jasmineSpecJs,
  test = jasmineTestJs,
) {
  const { language, logger, testFramework } = options;
  logger?.verbose(`configuring ${testFramework}...`);

  await writeFile(
    ".jasmine.json",
    JSON.stringify(config || jasmineConfig(language!), null, 2),
    options,
  );

  await updatePackageJson(options, (object) => ({
    ...object,
    scripts: {
      ...(object as any).scripts,
      test: "cross-env NODE_ENV=test BUILD_ENV=node-cjs nyc jasmine --config=.jasmine.json",
      "test:watch":
        'nodemon --exec "npm run test" --watch src --watch test --ext js',
    },
  }));

  return writeTestFiles(options, test, spec);
}
