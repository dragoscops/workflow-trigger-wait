import { mkdir, stat } from "fs/promises";
import { join as joinPath } from "path";
import { rimraf } from "rimraf";
import { CreateCommandOptions } from "../../types";

import writeFile from "../../util/write-file";

const noCode = "// no code";

export default async function <T extends CreateCommandOptions>(
  options: T,
  test = noCode,
  spec = noCode,
) {
  const { language, projectPath, logger } = options;
  logger?.verbose(`writing default test files...`);

  const codePath = joinPath(projectPath!, "test");
  try {
    const stats = await stat(codePath);
    if (stats.isDirectory()) {
      logger?.debug("src folder alread exists; moving on");
    } else {
      await rimraf(codePath);
    }
  } catch (e) {}
  await mkdir(codePath, { recursive: true });

  await writeFile(joinPath("test", `index.test.${language}`), test, options);
  return writeFile(joinPath("src", `index.spec.${language}`), spec, options);
}
