import readRepoFile from "../../util/read-repo-file";

import jasmine from "../../default/test-framework/jasmine";
import writeFile from "../../util/write-file";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  const jasmineConfig = await readRepoFile(
    "../../js/static/.jasmine-babel.js",
    options,
  );
  await writeFile(".jasmine/babel.js", jasmineConfig, options);

  return jasmine(options);
}
