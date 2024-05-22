import { readFile } from "fs/promises";
import { join as pathJoin } from "path";

import { GenericCommandOptions } from "../types";

export default async function <T extends GenericCommandOptions>(
  file: string,
  options: T,
): Promise<string> {
  const filePath = pathJoin(__dirname, file);
  const { logger } = options;
  try {
    return readFile(filePath).then((buffer) => buffer.toString("utf-8"));
  } catch (error: any) {
    logger?.error(`error reading ${filePath}`);
    logger?.debug(`error: ${error.message}\n\n ${error.stack}`);
    process.exit(1);
  }
}
