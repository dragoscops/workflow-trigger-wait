import { GenericCommandOptions } from "../types";
import writeFile from "../util/write-file";

export default async function <T extends GenericCommandOptions>(
  options: T,
): Promise<void> {
  const createRc = {
    ...options,
  };

  for (const item of [
    "logger",
    "projectPath",
    "packageManager",
    "testFramework",
    "qualityTools",
  ]) {
    delete (createRc as any)[item];
  }

  return writeFile(".createrc", createRc, options);
}
