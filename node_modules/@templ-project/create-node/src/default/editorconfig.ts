import { GenericCommandOptions } from "../types";
import writeFile from "../util/write-file";

export const editorConfig = `root = true

[*]
indent_style = space
indent_size = 2
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false`;

export default async function <T extends GenericCommandOptions>(
  options: T,
): Promise<void> {
  const { logger } = options;
  logger?.verbose(`configuring .editorconfig...`);

  return writeFile(".editorconfig", editorConfig, options);
}
