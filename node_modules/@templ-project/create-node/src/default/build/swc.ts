import { join as joinPath } from "path";
import { BuildCommandOptions, BuildTarget } from "../../types";
import globby from "globby";
import { readFile } from "fs/promises";
import mergeWith from "lodash.mergewith";
import { transform, Options as SwcOptions } from "@swc/core";
import { handleCompiledFile, writeEsmPackageJson } from "./babel";
import { buildSwcConfig } from "../build-tool/swc";

/**
 * Try to read local .swcrc.?.json and return its content.
 */
export async function readLocalSwcConfig({
  logger,
  projectPath,
  target,
}: Pick<
  BuildCommandOptions,
  "logger" | "projectPath" | "target"
>): Promise<SwcOptions> {
  const localPath = joinPath(
    projectPath,
    `.swcrc.${target.replace("node-", "")}.json`,
  );
  logger?.debug(`Reading local ${localPath}`);

  try {
    return readFile(localPath, "utf-8").then((content) => JSON.parse(content));
  } catch (e) {
    logger?.debug(
      `Error reading local ${localPath.replace(projectPath!, "")}: ${e}`,
    );
  }
  logger?.debug(`No local ${localPath} found`);
  return {};
}

/**
 * Combine local babel config with the in-memory one
 */
export async function generateSwcConfig({
  logger,
  projectPath,
  target,
}: Pick<
  BuildCommandOptions,
  "logger" | "projectPath" | "target"
>): Promise<SwcOptions> {
  const codeConfig: SwcOptions = buildSwcConfig(target);

  const localConfig = await readLocalSwcConfig({
    logger,
    projectPath,
    target,
  });

  const config = mergeWith(codeConfig, localConfig);
  logger?.debug(`Using SWC Config: ${JSON.stringify(config)}`);
  return config;
}

export async function compile(options: BuildCommandOptions) {
  const { logger, projectPath, target } = options;
  let errorCount = 0;
  let fileCount = 0;

  const babelConfig = await generateSwcConfig({ logger, projectPath, target });

  logger?.info("Compiling files...");
  const time = Date.now();

  await globby(joinPath(projectPath, "src", "**", "*.js"))
    .then((files) => files.filter((f) => !f.endsWith(".spec.js")))
    .then(async (files) => {
      for (const file of files) {
        fileCount++;
        logger?.debug(`Compiling .${file.replace(projectPath, "")}`);

        await readFile(file, "utf-8")
          .then((code) => transform(code, babelConfig))
          .then((result) => {
            handleCompiledFile(result?.code, file, {
              logger,
              projectPath,
              target,
            });
            handleCompiledFile(result?.map, `${file}.map`, {
              logger,
              projectPath,
              target,
            });
          })
          .catch((error) => {
            console.error(`${error.code}: ${error.message}`);
            // logger?.warn(
            //   `Error compiling ${file}:${error.loc.line}:${error.loc.column}`
            // );
            errorCount++;
          });
      }
    });

  writeEsmPackageJson(options);

  if (errorCount > 0) {
    logger?.warn(`Compilation done with ${errorCount} errors`);
    process.exit(1);
  }
  logger?.info(
    `Successfully compiled ${fileCount} file(s) in ${Date.now() - time}ms`,
  );
}

export default async function (options: BuildCommandOptions) {
  await compile(options);
}
