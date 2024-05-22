import readRepoFile from "../../util/read-repo-file";

import ava from "../../default/test-framework/ava";
import writeFile from "../../util/write-file";
import { CreateCommandOptions } from "../../types";
import { avaSpecJs, avaTestTs } from "../../constants";

export default async function (options: CreateCommandOptions) {
  const avaConfig = await readRepoFile(
    "../../static/ts/ava.config.js",
    options,
  );
  await writeFile("ava.config.js", avaConfig, options);

  return ava(options, avaSpecJs, avaTestTs);
}
