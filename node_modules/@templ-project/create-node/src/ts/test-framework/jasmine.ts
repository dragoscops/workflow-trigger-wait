import jasmine from "../../default/test-framework/jasmine";
import { CreateCommandOptions } from "../../types";

export default async function (options: CreateCommandOptions) {
  return jasmine(options);
}
