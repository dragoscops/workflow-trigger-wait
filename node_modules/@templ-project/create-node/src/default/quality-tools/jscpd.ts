import writeFile from "../../util/write-file";

import {
  appendRunS,
  update as updatePackageJson,
} from "../../default/create/package-json";
import { CreateCommandOptions } from "../../types";

export const jscpdConfig = {
  absolute: true,
  blame: true,
  ignore: ["**/__snapshots__/**", "**/*.min.js", "**/*.map"],
  output: ".jscpd",
  reporters: ["console", "badge"],
  threshold: 0.1,
};

export default async function (
  options: CreateCommandOptions,
  config = jscpdConfig,
) {
  const { logger } = options;
  logger?.info("updating package.json for jscpd tool...");

  const stringConfig = JSON.stringify(config, null, 2);
  await writeFile(".jscpd.json", stringConfig, options);

  return updatePackageJson(options, (object) => ({
    ...object,
    scripts: {
      ...(object as any).scripts,
      ca: appendRunS((object?.scripts as any)?.ca, "ca:quality"),
      "ca:quality": appendRunS(
        (object?.scripts as any)?.["ca:quality"],
        "jscpd",
      ),
      "jscpd:html": "npm run jscpd -- --reporters html",
      jscpd: "jscpd ./src --blame",
    },
  }));
}
