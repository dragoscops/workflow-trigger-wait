import { GenericCommandOptions } from "./types";
import logger from "./util/logger";

export default async function run<T extends GenericCommandOptions>(
  language: string,
  runner: string,
  options: T,
  count = 0,
) {
  try {
    const { default: irun } = await import(`./${language}/${runner}`);
    logger.debug(`resolving ${language}/${runner} ...`);
    return irun(options);
  } catch (error: any) {
    logger.debug(`./${language}/${runner} not found`);
    logger.debug(`error: ${error.message} \n ${error.stack}`);
    if (count > 1) {
      process.exit(1);
    }

    return run("default", runner, options, count + 1);
  }
}
