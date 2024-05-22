import { BuildCommandOptions } from "../../types";
import {
  CompilerHost,
  CompilerOptions,
  createProgram,
  Diagnostic,
  getPreEmitDiagnostics,
  parseJsonConfigFileContent,
  Program,
  readConfigFile,
  sys,
} from "typescript";
import { writeEsmPackageJson } from "../../default/build/babel";

export interface PartialTsConfig {
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  files?: string[];
  extends?: string;
  references?: Array<{
    path: string;
  }>;
}

export interface CreateProgramFromConfigOptions extends PartialTsConfig {
  configFilePath?: string;
  host?: CompilerHost;
}

/**/
export function createProgramFromConfig(
  { logger, projectPath }: BuildCommandOptions,
  {
    configFilePath,
    compilerOptions,
    include,
    exclude,
    files,
    extends: extend, // cuz keyword
    references,
    host,
  }: CreateProgramFromConfigOptions,
): Program {
  logger?.debug(`Reading tsconfig from ${configFilePath}`);
  const readResult = readConfigFile(configFilePath!, sys.readFile);

  if (readResult.error) {
    logger?.error(`Could not read tsconfig: ${readResult.error.messageText}`, [
      readResult.error,
    ]);
    process.exit(1);
  }
  const config: PartialTsConfig = readResult.config;

  config.compilerOptions = Object.assign(
    {},
    config.compilerOptions,
    compilerOptions,
  );
  if (include) {
    config.include = include;
  }
  if (exclude) {
    config.exclude = exclude;
  }
  if (files) {
    config.files = files;
  }
  if (extend) {
    config.extends = extend;
  }
  if (references) {
    config.references = references;
  }

  const { options, fileNames, projectReferences, errors } =
    parseJsonConfigFileContent(
      config,
      sys,
      projectPath!,
      undefined,
      configFilePath,
    );

  if (errors && errors.length) {
    logger?.error("Errors parsing config", errors);
  }

  const program = createProgram({
    options,
    rootNames: fileNames,
    projectReferences,
    host,
  });

  // https://github.com/Microsoft/TypeScript/issues/1863
  (program as any)[Symbol("exclude")] = config.exclude;

  return program;
}
/**/

function treatDiagnostics(
  { logger, projectPath }: BuildCommandOptions,
  { noEmit }: CompilerOptions,
  emitSkipped: boolean,
  diagnostics: Diagnostic[],
) {
  if (!noEmit && emitSkipped && diagnostics.length) {
    logger?.error(`Compilation done with ${diagnostics.length} errors`);
    diagnostics.forEach((d: Diagnostic) =>
      logger?.warn(
        `${
          typeof d.messageText === "string"
            ? d.messageText
            : JSON.stringify(d.messageText)
        } at ${d.file?.fileName?.replace(projectPath!, "")}:${d.start}`,
      ),
    );
  }
}

/**/
export function compile(options: BuildCommandOptions, program: Program) {
  const { logger, projectPath } = options;

  logger?.info("Compiling files...");
  const time = Date.now();

  const config = program.getCompilerOptions();

  config.listFiles = true;
  if (config.listFiles) {
    logger?.debug(
      "Files to compile: " +
        program
          .getRootFileNames()
          .map((f) => "." + f.replace(projectPath!, ""))
          .join(" "),
    );
  }
  // tslint:disable-next-line: prefer-const
  const { diagnostics, emitSkipped, emittedFiles } = program.emit();

  if (config.listEmittedFiles && emittedFiles) {
    logger?.debug(
      "Emitted files: " +
        emittedFiles.map((f) => "." + f.replace(projectPath!, "")).join(" "),
    );
  }

  // https://github.com/dsherret/ts-morph/issues/384
  const allDiagnostics: Diagnostic[] =
    getPreEmitDiagnostics(program).concat(diagnostics);
  treatDiagnostics(
    { logger, projectPath } as BuildCommandOptions,
    program.getCompilerOptions(),
    emitSkipped,
    allDiagnostics,
  );

  writeEsmPackageJson(options);

  if (allDiagnostics.length && emitSkipped) {
    logger?.warn(`Compilation done with ${allDiagnostics.length} errors`);
  } else {
    logger?.info(
      `Successfully compiled ${
        emittedFiles?.length ?? program.getRootFileNames().length
      } file(s) in ${Date.now() - time}ms`,
    );
  }
}
/**/

export default async function (options: BuildCommandOptions) {
  const { target } = options;

  const program = await createProgramFromConfig(options, {
    configFilePath: `tsconfig.${target.replace("node-", "")}.json`,
    compilerOptions: {
      rootDir: "src",
      outDir: `dist/${target}`,
      declaration: true,
      skipLibCheck: true,
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "test", "dist", "**/*.spec.ts"],
  });

  await compile(options, program);
}
