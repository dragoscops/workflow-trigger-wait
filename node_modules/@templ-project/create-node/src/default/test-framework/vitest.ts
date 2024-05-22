import writeFile from "../../util/write-file";

import { update as updatePackageJson } from "../../default/create/package-json";
import { CreateCommandOptions } from "../../types";
import writeTestFiles from "./write-test-files";
import { vitestSpecJs, vitestTestJs } from "../../constants";

export type VitestConfig = {
  test: {
    include: string[];
    reporters: string[];
  };
  [key: string]: any;
};

export const vitestConfig: VitestConfig = {
  test: {
    include: ["test/**/*.test"],
    reporters: ["verbose"],
  },
};

export default async function <T extends CreateCommandOptions>(
  options: T,
  config = vitestConfig,
  spec = vitestSpecJs,
  test = vitestTestJs,
) {
  const { logger, testFramework } = options;
  logger?.verbose(`configuring ${testFramework}...`);

  const configString = `// vitest.config

import {defineConfig} from "vite";

export default defineConfig(${JSON.stringify(config, null, 2)});`;

  await writeFile("vitest.config", configString, options);

  await updatePackageJson(options, (object) => ({
    ...object,
    scripts: {
      ...(object as any).scripts,
      test: "npm run test:watch -- --run",
      "test:watch": "cross-env NODE_ENV=test vitest",
    },
  }));

  return writeTestFiles(options, test, spec);
}
