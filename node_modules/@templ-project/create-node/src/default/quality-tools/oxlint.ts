import {
  appendRunS,
  update as updatePackageJson,
} from "../../default/create/package-json";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  const { language, logger } = options;
  logger?.info("updating package.json for oxlint tool...");

  return updatePackageJson(options, (object) => ({
    ...object,
    scripts: {
      ...(object as any).scripts,
      ca: appendRunS((object?.scripts as any)?.ca, "ca:lint"),
      "ca:lint": appendRunS((object?.scripts as any)?.["ca:lint"], "lint"),
      lint: "run-s lint:*",
      "lint:oxlint": `oxlint --jest-plugin --deny-warnings ./{src,test}/**/*.${language}`,
    },
  }));
}
