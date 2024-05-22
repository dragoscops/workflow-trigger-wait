import { vitestSpecJs, vitestTestJs } from "../../constants";
import vitest, { vitestConfig } from "../../default/test-framework/vitest";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  return vitest(
    options,
    {
      ...vitestConfig,
      testDir: ["src", "test"],
      testMatch: ["**/*.spec.ts", "**/*.test.ts"],
    },
    vitestSpecJs,
    vitestTestJs,
  );
}
