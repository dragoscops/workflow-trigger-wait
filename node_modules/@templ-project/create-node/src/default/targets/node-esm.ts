import writeFile from "../../util/write-file";
import { CreateCommandOptions } from "../../types";
import {
  PackageJsonOptions,
  update as updatePackageJson,
} from "../create/package-json";
import { esmModuleHelper } from "../../constants";
import { mkdir } from "fs/promises";
import { join as joinPath } from "path";

const addEsmModuleHelper = async (options: CreateCommandOptions) => {
  const { logger, projectPath, useDefaultCommands } = options;
  const esmScript = "node .scripts/esm-module.js";

  if (useDefaultCommands) {
    logger?.info("adding esm-module.js helper script...");
    await updatePackageJson(options, (object: PackageJsonOptions) => {
      // make sure to add esm-module.js command
      let buildNodeEsm = [
        ...(object?.scripts?.["build:node-esm"] || "").split(" && "),
        esmScript,
      ];
      // make values unique
      buildNodeEsm = [...new Set(buildNodeEsm)];

      return {
        ...object,
        scripts: {
          ...object.scripts,
          "build:node-esm": buildNodeEsm.join(" && "),
        },
      };
    });

    await mkdir(joinPath(projectPath!, ".scripts"), { recursive: true });
    await writeFile(".scripts/esm-module.js", esmModuleHelper, options);
  }
};

export default async function (options: CreateCommandOptions) {
  const { logger } = options;
  logger?.info("updating package.json for Node.Js ESM build...");

  await updatePackageJson(options, (object) => ({
    ...object,
    exports: {
      ...(object.exports || {}),
      ".": {
        ...(object.exports?.["."] || {}),
        import: "./dist/node/node-esm/index.js",
      },
    },
  }));

  await addEsmModuleHelper(options);
}
