import writeFile from "../util/write-file";
import { GenericCommandOptions } from "../types";

export const commitlintConfig = {
  extends: ["@commitlint/config-conventional"],
};

export default async function <T extends GenericCommandOptions>(
  options: T,
): Promise<void> {
  const { logger } = options;
  logger?.verbose(`configuring commitlint...`);

  const commitlintrc = `// .commitlintrc.js

module.exports = ${JSON.stringify(commitlintConfig, null, 2)};`;

  return writeFile(".commitlintrc.js", commitlintrc, options);
}
