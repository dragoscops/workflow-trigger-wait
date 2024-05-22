import { stat } from "fs/promises";
import { join as joinPath } from "path";

import {
  appendRunS,
  update as updatePackageJson,
} from "../../default/create/package-json";
import spawn from "../../util/spawn";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  const { logger, projectPath } = options;
  logger?.info("updating package.json for dependency-cruiser tool...");

  try {
    const stats = await stat(joinPath(projectPath!, ".dependency-cruiser.js"));
    if (stats.isFile()) {
      console.log(`.dependency-cruiser.js already exists; moving on.`);
      return;
    }
  } catch (error) {}

  await spawn(["./node_modules/.bin/depcruise", "--init", "oneshot"], {
    cwd: options.projectPath,
    stdio: "inherit",
  });

  return updatePackageJson(options, (object) => ({
    ...object,
    scripts: {
      ...(object as any).scripts,
      ca: appendRunS((object?.scripts as any)?.ca, "ca:quality"),
      "ca:quality": appendRunS(
        (object?.scripts as any)?.["ca:quality"],
        "depcruise",
      ),
      depcruise: "depcruise --config .dependency-cruiser.js src",
    },
  }));
}
