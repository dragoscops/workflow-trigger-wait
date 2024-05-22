import vitest, { vitestConfig } from "../../default/test-framework/vitest";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  return vitest(options, {
    ...vitestConfig,
    testDir: ["src", "test"],
    testMatch: ["**/*.spec.js", "**/*.test.js"],
  });
}
