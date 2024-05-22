import { mochaSpecJs, mochaTestJs } from "../../constants";
import { CreateCommandOptions, ProgrammingLanguage } from "../../types";
import writeFile from "../../util/write-file";
import { update as updatePackageJson } from "../create/package-json";
import writeTestFiles from "./write-test-files";

export type MochaConfig = {
  extensions: string[];
  spec: string;
  recursive: boolean;
  reporter: string;
  timeout: number;
  require: string[];
  [key: string]: any;
};

export const mochaConfig = (language: ProgrammingLanguage): MochaConfig => ({
  extensions: [language],
  spec: `./{src,test}/**/*.{spec,test}.${language}`,
  recursive: true,
  reporter: "spec",
  timeout: 5000,
  require: [
    "chai/register-assert.js",
    "chai/register-expect.js",
    "chai/register-should.js",
  ],
});

export default async function (
  options: CreateCommandOptions,
  config?: MochaConfig,
  spec = mochaSpecJs,
  test = mochaTestJs,
) {
  const { language, logger, testFramework } = options;
  config = config || mochaConfig(language!);
  logger?.verbose(`configuring (${language}) ${testFramework}...`);

  await updatePackageJson(options, (object) => ({
    ...object,
    scripts: {
      ...(object as any).scripts,
      test: `npm run test:single`,
      // BUILD_ENV is for babel
      "test:single": `cross-env NODE_ENV=test ${
        language === "js" ? "BUILD_ENV=node-cjs" : ""
      } nyc mocha --forbid-only`,
      "test:watch": "npm run test -- --watch",
    },
  }));

  const stringConfig = `// .mocharc.js

module.exports = ${JSON.stringify(config, null, 2)};`;

  await writeFile(".mocharc.js", stringConfig, options);

  return writeTestFiles(options, test, spec);
}
