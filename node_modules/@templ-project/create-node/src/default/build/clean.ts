import { join as joinPath } from "path";
import { rimraf } from "rimraf";
import { BuildCommandOptions } from "../../types";

export default async function ({ outDir, projectPath }: BuildCommandOptions) {
  await rimraf(joinPath(process.cwd(), joinPath(projectPath!, outDir)));
}
