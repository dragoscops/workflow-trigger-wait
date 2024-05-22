import { codeTs } from "../constants";
import callable from "../default/code";
import { CreateCommandOptions } from "../types";

export default async function (options: CreateCommandOptions) {
  await callable(options, codeTs);
}
