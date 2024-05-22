import {
  appendRunS,
  update as updatePackageJson,
} from "../../default/create/package-json";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  const { logger } = options;
  logger?.info("updating package.json for license-checker tool...");

  return updatePackageJson(options, (object) => ({
    ...object,
    scripts: {
      ...(object as any).scripts,
      ca: appendRunS((object?.scripts as any)?.ca, "ca:security"),
      "ca:security": appendRunS(
        object?.scripts?.["ca:security"],
        "license-check",
      ),
      "license-check": `npx license-checker --production --json --failOn="${[
        "AGPL AGPL 1.0",
        "AGPL 3.0",
        "CDDL or GPLv2 with exceptions",
        "CNRI Python GPL Compatible",
        "Eclipse 1.0",
        "Eclipse 2.0",
        "GPL",
        "GPL 1.0",
        "GPL 2.0",
        "GPL 2.0 Autoconf",
        "GPL 2.0 Bison",
        "GPL 2.0 Classpath",
        "GPL 2.0 Font",
        "GPL 2.0 GCC",
        "GPL 3.0",
        "GPL 3.0 Autoconf",
        "GPL 3.0 GCC",
        "GPLv2 with XebiaLabs FLOSS License Exception",
        "LGPL",
        "LGPL 2.0",
        "LGPL 2.1",
        "LGPL 3.0",
        "Suspected Eclipse 1.0",
        "Suspected Eclipse 2.0",
      ].join("; ")}"`,
    },
  }));
}
