import { Logger } from "winston";

export type BuildTarget = "browser" | "bun" | "deno" | "node-cjs" | "node-esm";

export type BuildTool = "babel" | "esbuild" | "rollup" | "swc" | "tsc";

export type PackageManager = "npm" | "pnpm" | "yarn";

export type ProgrammingLanguage = "js" | "ts"; // | "coffee";

export type QualityTool =
  | "audit"
  | "eslint"
  | "oxlint"
  | "prettier"
  | "jscpd"
  | "dependency-cruiser"
  | "license-checker";

export type TestFramework =
  | "ava"
  | "deno"
  | "mocha"
  | "jasmine"
  | "jest"
  | "vitest";

export type GenericCommandOptions = {
  language?: ProgrammingLanguage;
  logger?: Logger;
  projectPath?: string;
};

export type BuildCommandOptions = GenericCommandOptions & {
  buildTool: BuildTool;
  outDir: string;
  target: BuildTarget;
};

export type CreateCommandOptions = GenericCommandOptions & {
  buildTool?: string;
  packageManager: PackageManager;
  qualityTools: QualityTool[];
  targets?: BuildTarget[];
  testFramework: TestFramework;
  useDefaultCommands: boolean;
};
