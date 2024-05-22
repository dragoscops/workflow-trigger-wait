import { jestSpecJs, jestTestTs } from "../../constants";
import jest, { jestConfig } from "../../default/test-framework/jest";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  const { language } = options;

  return jest(
    options,
    {
      ...jestConfig(language!),
      transform: { "^.+\\.ts$": "ts-jest" },
    },
    jestSpecJs,
    jestTestTs,
  );
}
