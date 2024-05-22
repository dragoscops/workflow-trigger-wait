import { CreateCommandOptions } from "../../types";
import {
  PackageJsonOptions,
  update as updatePackageJson,
} from "../create/package-json";

export default async function (options: CreateCommandOptions) {
  const { logger } = options;
  logger?.info("updating package.json for browser build...");

  return updatePackageJson(options, (object: PackageJsonOptions) => ({
    ...object,
    exports: {
      ...(object.exports || {}),
      ".": {
        ...(object?.exports?.["."] || {}),
        browser: "./dist/browser/index.js",
        worker: "./dist/browser/index.js",
      },
    },
    scripts: {
      ...object.scripts,
      "build:browser-bundle":
        "esbuild --bundle dist/browser/index.js --format=esm --target=es2020 --outfile=dist/browser/index.bundle.js",
      "build:browser-bundle-min":
        "esbuild --minify --bundle dist/browser/index.js --format=esm --target=es2020 --outfile=dist/browser/index.bundle.min.js",
      "build:browser-umd":
        'rollup dist/browser/index.bundle.js --format umd --name "@templ-project/node-typescript" -o dist/browser/index.umd.js',
      "build:browser-umd-min":
        'rollup dist/browser/index.bundle.min.js --compact --format umd --name "@templ-project/node-typescript" -o dist/browser/index.umd.min.js',
    },
  }));
}
