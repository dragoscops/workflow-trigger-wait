import { mkdir, stat } from "fs/promises";
import { join as joinPath } from "path";

import spawn from "../spawn";
import which from "../which";
import writeFile from "../write-file";
import continuePrompt from "../inquire-continue";
import { GenericCommandOptions, PackageManager } from "../../types";

const createMockPackageJson = async <T extends GenericCommandOptions>(
  options: T,
): Promise<void> =>
  process.env.SKIP_NPM_INIT
    ? writeFile(
      joinPath(options.projectPath!, "package.json"),
      JSON.stringify({
        devDependencies: {},
        scripts: {},
      }),
      options,
    )
    : undefined;

export type PackageManagerInitOptions = GenericCommandOptions & {
  packageManager: PackageManager;
};

export type PackageManagerInstallOptions = GenericCommandOptions & {
  save?: boolean;
  saveDev?: boolean;
  savePeer?: boolean;
  force?: boolean;
};

export async function init<T extends PackageManagerInitOptions>(
  options: T,
): Promise<void> {
  const { projectPath, logger } = options;

  try {
    const stats = await stat(joinPath(projectPath!, "package.json"));
    if (stats.isFile()) {
      console.warn(`Project folder already exists.`);
      await continuePrompt();
    }
  } catch (e) {}

  logger?.verbose(`creating ${projectPath}...`);
  await mkdir(projectPath!, { recursive: true });

  await createMockPackageJson(options);

  const { packageManager } = options;
  const binary = await which(packageManager);

  await spawn([binary, "init"], { cwd: projectPath, stdio: "inherit" });
}
