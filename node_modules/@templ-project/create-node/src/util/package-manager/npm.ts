import {
  init as genericInit,
  PackageManagerInitOptions,
  PackageManagerInstallOptions,
} from "./generic";
import spawn from "../spawn";
import { whichNpm } from "../which";

export async function init<T extends PackageManagerInitOptions>(
  options: T,
): Promise<void> {
  return genericInit(options);
}

export async function install<T extends PackageManagerInstallOptions>(
  packages: string[],
  options: T,
): Promise<void> {
  const { force, projectPath, save, saveDev } = options;
  const binary = await whichNpm();
  const args = [binary, "i"];

  if (save) {
    args.push("-S");
  } else {
    if (saveDev) {
      args.push("-D");
    }
  }

  // savePeer is not supported by npm

  args.push(...packages);

  if (force) {
    // args.push("--force");
    args.push("--legacy-peer-deps");
  }

  return spawn(args, { cwd: projectPath, stdio: "inherit" }) as Promise<void>;
}
