import { BuildCommandOptions } from "../../types";
import {
  buildBabelConfig,
  handleCompiledFile,
  handleCompiledFileAndMap,
  writeEsmPackageJson,
} from "./babel";
import globby from "globby";
import { readFile, stat } from "fs/promises";
import * as esbuild from "esbuild";
import { join as joinPath } from "path";

export const esbuildTransformOptions = (
  options: BuildCommandOptions,
): esbuild.TransformOptions => {
  const { language, target } = options;

  return {
    // @see https://esbuild.github.io/api/#format
    format: target === "node-cjs" ? "cjs" : "esm",
    // @see https://esbuild.github.io/api/#target
    target: (target !== "browser"
      ? "es2020,node16"
      : "es2020,chrome58,edge16,firefox57,safari11"
    ).split(","),
    // @see https://esbuild.github.io/api/#loader
    ...(language === "ts" ? { loader: "ts" } : {}),
    // @see https://esbuild.github.io/api/#sourcemap
    sourcemap: true,
    // TODO: should I use babel plugin here?
    // plugins: babelPlugins,
  };
};

export async function compile(options: BuildCommandOptions) {
  const { logger, projectPath, target } = options;
  let errorCount = 0;
  let warningCount = 0;
  let fileCount = 0;

  // const babelConfig = await buildBabelConfig({ logger, projectPath, target });

  logger?.info("Compiling files...");
  const time = Date.now();

  await globby(joinPath(projectPath, "src", "**", "*.js"))
    .then((files) => files.filter((f) => !f.endsWith(".spec.js")))
    .then(async (files) => {
      for (const file of files) {
        fileCount++;
        logger?.debug(`Compiling .${file.replace(projectPath, "")}`);

        await readFile(file, "utf-8")
          .then((code) =>
            // @see https://esbuild.github.io/api/#transform
            esbuild.transform(code, esbuildTransformOptions(options)),
          )
          .then((result) => {
            handleCompiledFileAndMap(
              result?.code,
              result?.map,
              file.replace(/\.ts$/, ".js"),
              {
                logger,
                projectPath,
                target,
              },
            );
          })
          .catch(async (error: esbuild.TransformFailure) => {
            if (error.warnings.length > 0) {
              await esbuild
                .formatMessages(error.warnings, {
                  kind: "warning",
                  color: true,
                  terminalWidth: 80,
                })
                .then((messages) => console.log(messages.join("\n")));
              warningCount += error.warnings.length;
            }
            if (error.errors.length > 0) {
              await esbuild
                .formatMessages(error.errors, {
                  kind: "error",
                  color: true,
                  terminalWidth: 80,
                })
                .then((messages) => console.log(messages.join("\n")));
              errorCount += error.errors.length;
            }
          });
      }
    });

  writeEsmPackageJson(options);

  if (errorCount > 0) {
    logger?.warn(`Compilation failed with ${errorCount} error(s)`);
    process.exit(1);
  }
  if (warningCount > 0) {
    logger?.warn(`Compilation done with ${warningCount} warning(s)`);
    process.exit(0);
  }
  logger?.info(`Successfully compiled in ${Date.now() - time}ms`);
}

export default async function (options: BuildCommandOptions) {
  await compile(options);
}
