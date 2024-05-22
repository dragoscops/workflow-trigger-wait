import {
  appendRunS,
  update as updatePackageJson,
} from "../../default/create/package-json";
import { CreateCommandOptions } from "../../types";

/**
 * @param options {{
      packageManager: 'npm' | 'pnpm' | 'yarn'
    }}
 */
export default async function (options: CreateCommandOptions) {
  const { packageManager, logger } = options;
  logger?.info("updating package.json for audit tool...");

  return updatePackageJson(options, (object) => ({
    ...object,
    scripts: {
      ...(object as any).scripts,
      ca: appendRunS((object?.scripts as any)?.ca, "ca:security"),
      "ca:security": appendRunS(
        object?.scripts?.["ca:security"],
        "audit-modules",
      ),
      "audit-modules":
        packageManager === "npm"
          ? "npm audit"
          : packageManager === "pnpm"
            ? "pnpm audit"
            : packageManager === "yarn"
              ? "yarn audit --groups=dependencies"
              : 'echo "Unknown package manager for audit"',
    },
  }));
}
