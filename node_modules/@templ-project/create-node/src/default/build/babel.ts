import { join as joinPath } from "path";
import { BuildCommandOptions } from "../../types";
import globby from "globby";
import { readFile, stat } from "fs/promises";
import { BabelFileResult, transformAsync } from "@babel/core";
import {
  babelConfigBrowser,
  babelConfigCjs,
  babelConfigEsm,
  getTargetedBabelRcName,
} from "../build-tool/babel";
import writeFile from "../../util/write-file";
import mergeWith from "lodash.mergewith";

export const mergeConfigs = (...configs: Record<string, unknown>[]) => {
  switch (configs.length) {
  case 0:
    return {};
  case 1:
    return configs[0];
  default:
    const config1 = configs.shift();
    const config2 = configs.shift();
    Object.keys(config2).forEach((key) => {
      if (Array.isArray(config1?.[key]) && Array.isArray(config2[key])) {
        config1[key] = [
          ...new Set([
            ...(config1[key] as unknown[]),
            ...(config2[key] as unknown[]),
          ]),
        ];
      } else if (
        typeof config1[key] === "object" &&
          typeof config2[key] === "object"
      ) {
        config1[key] = mergeConfigs(
            config1[key] as Record<string, unknown>,
            config2[key] as Record<string, unknown>,
        );
      } else {
        config1[key] = config2[key];
      }
    });
    return mergeConfigs(config1, ...configs);
  }
};

/**
 * Try to read local .babelrc.?.js and return its content.
 */
export async function readLocalBabelConfig({
  logger,
  projectPath,
  target,
}: Pick<BuildCommandOptions, "logger" | "projectPath" | "target">): Promise<
  Record<string, unknown>
> {
  const localPath = joinPath(projectPath, getTargetedBabelRcName(target));
  logger?.debug(`Reading local ${localPath}`);

  try {
    await stat(localPath);
    return require(localPath);
  } catch (e) {
    logger?.debug(`Error reading local ${localPath}: ${e}`);
  }
  logger?.debug(`No local ${localPath} found`);
  return {};
}

/**
 * Combine local babel config with the in-memory one
 */
export async function buildBabelConfig({
  logger,
  projectPath,
  target,
}: Pick<BuildCommandOptions, "logger" | "projectPath" | "target">): Promise<
  Record<string, unknown>
> {
  const codeConfig =
    target === "node-cjs"
      ? babelConfigCjs
      : target === "node-esm"
        ? babelConfigEsm
        : babelConfigBrowser;

  const localConfig = await readLocalBabelConfig({
    logger,
    projectPath,
    target,
  });

  const config = mergeWith(codeConfig, localConfig);
  logger?.debug(`Using Babel Config: ${JSON.stringify(config)}`);
  return config;
}

export async function handleCompiledFile(
  code: string,
  file: string,
  {
    logger,
    projectPath,
    target,
  }: Pick<BuildCommandOptions, "logger" | "projectPath" | "target">,
): Promise<string> {
  const distPath = file
    .replace(projectPath, "")
    .replace(/^\/src/, joinPath(".", "dist", target));

  await writeFile(distPath, code, {
    logger,
    projectPath,
  });

  return distPath;
}

export async function handleCompiledFileAndMap(
  code: string,
  map: string,
  file: string,
  {
    logger,
    projectPath,
    target,
  }: Pick<BuildCommandOptions, "logger" | "projectPath" | "target">,
) {
  const distPath = await handleCompiledFile(code, file, {
    logger,
    projectPath,
    target,
  });

  await writeFile(`${distPath}.map`, map, {
    logger,
    projectPath,
  });
}

export async function writeEsmPackageJson(options: BuildCommandOptions) {
  const { target } = options;
  if (target === "node-esm") {
    await writeFile(`dist/${target}/package.json`, { type: "module" }, options);
  }
}

export async function compile(options: BuildCommandOptions) {
  const { logger, projectPath, target } = options;
  let errorCount = 0;
  let fileCount = 0;

  const babelConfig = await buildBabelConfig({ logger, projectPath, target });

  logger?.info("Compiling files...");
  const time = Date.now();

  await globby(joinPath(projectPath, "src", "**", "*.js"))
    .then((files) => files.filter((f) => !f.endsWith(".spec.js")))
    .then(async (files) => {
      for (const file of files) {
        fileCount++;
        logger?.debug(`Compiling .${file.replace(projectPath, "")}`);

        await readFile(file, "utf-8")
          .then((code) => transformAsync(code, babelConfig))
          .then((result) =>
            handleCompiledFile(result?.code, file, {
              logger,
              projectPath,
              target,
            }),
          )
          .catch((error) => {
            console.error(`${error.reasonCode}: ${error.message}`);
            logger?.warn(
              `Error compiling ${file}:${error.loc.line}:${error.loc.column}`,
            );
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
