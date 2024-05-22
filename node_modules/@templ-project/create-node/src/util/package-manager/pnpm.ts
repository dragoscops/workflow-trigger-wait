import {
  init as genericInit,
  PackageManagerInitOptions,
  PackageManagerInstallOptions,
} from "./generic";
import spawn from "../spawn";
import { whichPnpm } from "../which";

export async function init<T extends PackageManagerInitOptions>(options: T) {
  return genericInit(options);
}

export async function install<T extends PackageManagerInstallOptions>(
  packages: string[],
  options: T,
): Promise<void> {
  const { force, projectPath, saveDev } = options;
  const binary = await whichPnpm();
  const args = [binary, "add"];

  // Determine the type of dependency to save
  if (saveDev) {
    args.push("-D");
  }

  // savePeer is not supported by pnpm

  args.push(...packages);

  if (force) {
    // args.push("--force");
    // args.push("--legacy-peer-deps");
  }

  return spawn(args, { cwd: projectPath, stdio: "inherit" }) as Promise<void>;
}
