import {
  init as genericInit,
  PackageManagerInitOptions,
  PackageManagerInstallOptions,
} from "./generic";
import spawn from "../spawn";
import { whichYarn } from "../which";

export async function init<T extends PackageManagerInitOptions>(options: T) {
  return genericInit(options);
}

export async function install<T extends PackageManagerInstallOptions>(
  packages: string[],
  options: T,
): Promise<void> {
  const { force, projectPath, saveDev } = options;
  const binary = await whichYarn();
  const args = [binary, "add"];

  if (saveDev) {
    args.push("-D");
  }

  args.push(...packages);

  if (force) {
    // TODO: haven't decided how to handle this yet
  }

  return spawn(args, { cwd: projectPath, stdio: "inherit" }) as Promise<void>;
}
