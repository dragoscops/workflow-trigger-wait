import { platform } from "os";

import spawn from "./spawn";

/** @param binary string */
export default async function which(binary: string): Promise<string> {
  if (platform() === "win32") {
    return spawn(["where", binary]).then((b: string) => b!.trim());
  }
  return spawn(["which", binary]).then((b: string) => b!.trim());
}

export const whichNode = () => which("node");
export const whichNpm = () => which("npm");
export const whichPnpm = () => which("pnpm");
export const whichYarn = () => which("yarn");

// /** TODO: must rewrite using require.resolve() */
// export async function getModulePath(moduleName: string, dir = import.meta.url.replace("file://", "")) {
//   let stats: Stats | null = null;
//   try {
//     stats = await stat(dir);
//   } catch (e) {
//     logger.debug(`Unable to stat ${dir}`, e);
//   }
//   if (stats) {
//     if (stats.isDirectory()) {
//       const moduleDir = pathJoin(dir, "node_modules", moduleName);
//       try {
//         stats = await stat(moduleDir);
//         if (stats && stats.isDirectory()) {
//           return moduleDir;
//         }
//       } catch (e) {}
//     }
//     if (dir !== dirname(dir)) {
//       return getModulePath(moduleName, dirname(dir));
//     }
//   }
//   return resolve(moduleName, import.meta.url);
// }
