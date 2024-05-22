import { mkdir, stat } from "fs/promises";
import { join as joinPath } from "path";
import { rimraf } from "rimraf";

import { GenericCommandOptions } from "../types";
import writeFile from "../util/write-file";
import { codeJs } from "../constants";

export default async function <T extends GenericCommandOptions>(
  options: T,
  code = codeJs,
): Promise<void> {
  const { language, logger, projectPath } = options;

  logger?.verbose("creating src/ ...");

  const codePath = joinPath(projectPath!, "src");
  try {
    const stats = await stat(codePath);
    if (stats.isDirectory()) {
      console.log("src folder alread exists; moving on");
    } else {
      await rimraf(codePath);
    }
  } catch (e: any) {}
  await mkdir(codePath, { recursive: true });

  return writeFile(joinPath("src", `index.${language}`), code, options);
}
