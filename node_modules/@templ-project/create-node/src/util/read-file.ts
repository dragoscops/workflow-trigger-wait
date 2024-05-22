import { readFile } from "fs/promises";
import { join as joinPath } from "path";
import { GenericCommandOptions } from "../types";

export default async function <T extends GenericCommandOptions>(
  file: string,
  options: T,
): Promise<string> {
  const { projectPath, logger } = options;
  const filePath = joinPath(projectPath!, file);

  logger?.debug(`reading ${filePath}...`);
  try {
    return readFile(filePath).then((buffer) => buffer.toString("utf-8"));
  } catch (error: any) {
    logger?.error(`error reading ${filePath}`);
    logger?.debug(`error: ${error.message}\n\n ${error.stack}`);
    process.exit(1);
  }
}
