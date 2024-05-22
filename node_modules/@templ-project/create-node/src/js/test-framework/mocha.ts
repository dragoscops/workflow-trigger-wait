import mocha, { mochaConfig } from "../../default/test-framework/mocha";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  const { language } = options;
  const config = mochaConfig(language!);

  return mocha(options, {
    ...config,
    require: ["@babel/register", ...config.require],
  });
}
