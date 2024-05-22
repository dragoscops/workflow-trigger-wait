import { join as joinPath } from "path";

import spawn from "../util/spawn";
import readFile from "../util/read-file";
import writeFile from "../util/write-file";
import { GenericCommandOptions } from "../types";

export const configureCommitLint = async <T extends GenericCommandOptions>(
  options: T,
): Promise<void> => {
  const commitLintPath = joinPath(".husky", "_", "commit-msg");
  let commitLint = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"`;

  try {
    commitLint = await readFile(commitLintPath, options).then((buffer) =>
      buffer.toString(),
    );
  } catch (e) {}
  await writeFile(
    commitLintPath,
    `${commitLint}

echo npx commitlint --edit $1`,
    options,
  );
};

export const configurePreCommit = async <T extends GenericCommandOptions>(
  options: T,
): Promise<void> => {
  const preCommitPath = joinPath(".husky", "_", "pre-commit");
  let preCommit = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"`;

  try {
    preCommit = await readFile(preCommitPath, options).then((buffer) =>
      buffer.toString(),
    );
  } catch (e) {}
  await writeFile(
    preCommitPath,
    `${preCommit}

npm run ca
npm run test
npm run build

git add -u`,
    options,
  );
};

const ensureGitFolder = async <T extends GenericCommandOptions>(
  options: T,
): Promise<void> => {
  return spawn(["git", "init"], {
    cwd: options.projectPath,
    stdio: "inherit",
  }) as Promise<void>;
};

export default async function <T extends GenericCommandOptions>(
  options: T,
): Promise<void> {
  const { projectPath } = options;

  await ensureGitFolder(options);
  await spawn(["./node_modules/.bin/husky"], {
    cwd: projectPath,
    stdio: "inherit",
  });

  await configureCommitLint(options);
  await configurePreCommit(options);
}
