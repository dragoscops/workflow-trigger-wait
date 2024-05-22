import run from "../run";
import { BuildTarget, BuildTool, CreateCommandOptions } from "../types";

import {
  allBuildTools,
  allLanguages,
  allPackageManagers,
  allQualityTools,
  allTargets,
  allTestFrameworks,
} from "../constants";

export const createOptionsValidate = (options: CreateCommandOptions): void => {
  const {
    buildTool,
    language,
    logger,
    packageManager,
    qualityTools,
    targets,
    testFramework,
  } = options;

  const testsAndMessages = [
    [
      !allLanguages.includes(language!),
      `Invalid language '${language}'. Accepted: ${allLanguages.join(", ")}`,
    ],
    [
      !(targets as BuildTarget[])
        .map((t) => allTargets.includes(t))
        .reduce((a, c) => a && c, true),
      `Invalid targets '${targets?.join(", ")}'. Accepted: ${allTargets.join(
        ", ",
      )}`,
    ],
    [
      !allPackageManagers.includes(packageManager),
      `Invalid language '${packageManager}'. Accepted: ${allPackageManagers.join(
        ", ",
      )}`,
    ],
    [
      !allTestFrameworks.includes(testFramework),
      `Invalid test frame '${testFramework}'. Accepted: ${allTestFrameworks.join(
        ", ",
      )}`,
    ],
    [
      !qualityTools
        .map((qt) => allQualityTools.includes(qt))
        .reduce((a, c) => a && c, true),
      `Invalid targets '${qualityTools.join(
        ", ",
      )}'. Accepted: ${allQualityTools.join(", ")}`,
    ],
    [
      ![undefined, ...allBuildTools].includes(buildTool as BuildTool),
      `Invalid build tool '${buildTool}'. Accepted: ${allBuildTools.join(
        ", ",
      )}`,
    ],
  ];

  for (const [test, message] of testsAndMessages) {
    if (test) {
      logger?.warn(message);
      process.exit(1);
    }
  }
};

export default async function (options: CreateCommandOptions) {
  const { language, qualityTools, buildTool, testFramework, targets } = options;

  const runners = [
    // project init
    "create/package-json",

    // npm i
    "create/install",

    // deploy code
    "code",

    // deploy tests
    `test-framework/${testFramework}`,

    // deploy validate stuff
    "commitlint",
    "editorconfig",

    // deploy builder
    // ...(language === "coffee" ? [] : []),// TODO: add coffee support
    ...(language === "js" || (language === "ts" && testFramework === "jasmine")
      ? ["build-tool/babel"]
      : []),
    ...(language === "ts" ? ["build-tool/tsc"] : []),
    ...(buildTool ? [`build-tool/${buildTool}`] : []),

    // deploy target settings
    ...(targets ? targets.map((t) => `targets/${t}`) : []),

    // deploy quality tools
    ...qualityTools.map((qt) => `quality-tools/${qt}`),

    // git
    "husky",

    // create
    "createrc",
  ];

  for (const runner of runners) {
    await run(language as string, runner, options);
  }
}
