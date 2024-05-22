import { BuildTarget } from "src/types";

const has = (targets: string[], target: string) => targets.includes(target);

export const hasBrowser = (targets: string[]) => has(targets, "browser");
export const hasBun = (targets: string[]) => has(targets, "bun");
export const hasDeno = (targets: string[]) => has(targets, "deno");

export const hasBrowserBunOrDeno = (targets: string[]) =>
  hasBrowser(targets) || hasBun(targets) || hasDeno(targets);

export const hasCjs = (targets: string[]) => has(targets, "node-cjs");
export const hasEsm = (targets: string[]) => has(targets, "node-esm");

export const getBuildableTargets = (targets: BuildTarget[]) =>
  [
    ...(hasBrowserBunOrDeno(targets) ? ["browser"] : []),
    ...(hasCjs(targets) ? ["node-cjs"] : []),
    ...(hasEsm(targets) ? ["node-esm"] : []),
  ] as BuildTarget[];
