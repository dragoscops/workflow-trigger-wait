import { update as updatePackageJson } from "../create/package-json";
import readRepoFile from "../../util/read-repo-file";
import writeFile from "../../util/write-file";
import { BuildTarget, CreateCommandOptions } from "../../types";
import { getBuildableTargets } from "../targets";
import { generateBuildCommand } from ".";
import { Options as SwcOptions } from "@swc/core";

export function buildSwcConfig(target: BuildTarget): SwcOptions {
  let config: SwcOptions = {
    jsc: {
      parser: {
        syntax: "ecmascript",
      },
      transform: {},
    },
    env: {
      targets: {
        browsers: "> 0.25%, not dead, last 2 versions",
      },
      // mode: "usage",
    },
    module: {
      type: "es6",
    },
    sourceMaps: true,
  };

  if (target.startsWith("node-")) {
    delete config.env.targets.browsers;
  }

  if (target === "node-cjs") {
    delete config.env.targets;

    config = {
      ...config,
      jsc: {
        ...config.jsc,
      },
      env: {
        ...config.env,
        targets: {
          ...config.env.targets,
          node: "16",
        },
      },
      module: {
        type: "commonjs",
      },
    };
  }

  if (target === "node-esm") {
    config = {
      ...config,
      env: {
        ...config.env,
        targets: {
          ...config.env.targets,
          node: "16",
        },
        mode: "entry",
      },
      module: {
        type: "es6",
      },
    };
  }

  return config;
}

export default async function (options: CreateCommandOptions) {
  const { targets, logger, buildTool, useDefaultCommands } = options;
  logger?.verbose(`configuring (js) ${buildTool}...`);

  for (const target of getBuildableTargets(targets)) {
    const fileName = `swcrc.${target.replace("node-", "")}.json`;
    await writeFile(
      `.${fileName}`,
      buildSwcConfig(target) as Record<string, unknown>,
      options,
    );
  }

  return updatePackageJson(options, (packageObject) => ({
    ...packageObject,
    scripts: {
      ...packageObject.scripts,
      build: "run-s clean build:*",
      ...getBuildableTargets(targets)
        .map((target: BuildTarget) => ({
          [`build:${target}`]: useDefaultCommands
            ? `swc src -d dist/${target} -s true --config-file .swcrc.${target.replace(
              "node-",
              "",
            )}.json --extensions .js --ignore src/**/*.spec.js`
            : generateBuildCommand({ target, buildTool: "swc" }),
        }))
        .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
    },
  }));
}
