import prettier, { prettierConfig } from "../../default/quality-tools/prettier";
import { update as updatePackageJson } from "../../default/create/package-json";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  const { logger } = options;

  await prettier(options, {
    ...prettierConfig,
    overrides: [
      ...(prettierConfig as any).overrides,
      {
        files: "*.js",
        options: {
          parser: "babel",
        },
      },
    ],
    parser: "typescript",
  });

  logger?.info("updating package.json for (babel) prettier tool...");

  await updatePackageJson(options, (object) => ({
    ...object,
    importSort: {
      ".js, .jsx": {
        parser: "babylon",
        style: "module",
      },
      ".ts, .tsx": {
        parser: "typescript",
        style: "module",
      },
    },
  }));
}
