import { spawn, SpawnOptions as CPSpawnOptions } from "child_process";

import logger from "./logger";

export type SpawnOptions = CPSpawnOptions & {
  cwd?: string;
};

export default async function (
  command: string[],
  options?: SpawnOptions,
): Promise<void | string> {
  logger.debug(
    `executing '${command.join(" ")}' with options '${JSON.stringify(options)}'`,
  );

  return new Promise((resolve, reject) => {
    const proc = spawn(command[0], command.length > 1 ? command.slice(1) : [], {
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    });
    let stdout = "";
    let stderr = "";

    if (!options?.stdio) {
      proc?.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      proc?.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
    }

    proc?.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        logger.error(`'${command.join(" ")}' exited with code ${code}.`);
        logger.debug(`error: ${stderr}`); // TODO: ?? no reject ???
        process.exit(1);
      }
    });
  });
}
