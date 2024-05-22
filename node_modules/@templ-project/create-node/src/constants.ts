import {
  BuildTarget,
  BuildTool,
  PackageManager,
  ProgrammingLanguage,
  QualityTool,
  TestFramework,
} from "./types";

/*******************************************************************************
 * Program Options
 */

export const allLanguages: ProgrammingLanguage[] = ["js", "ts" /*, "coffee" */];

export const allBuildTools: BuildTool[] = [
  "babel",
  "esbuild",
  "rollup",
  "swc",
  "tsc",
];

export const allPackageManagers: PackageManager[] = ["npm", "pnpm", "yarn"];

export const allQualityTools: QualityTool[] = [
  "eslint",
  "oxlint",
  "prettier",
  "jscpd",
  "dependency-cruiser",
  "license-checker",
  "audit",
];

export const allTargets: BuildTarget[] = [
  "browser",
  "bun",
  // "deno",
  "node-cjs",
  "node-esm",
];

export const allTestFrameworks: TestFramework[] = [
  // "ava",
  // "bun", // TODO: was not implemented so far
  // "deno", // TODO: undecided whether to support or not ...
  // "mocha",
  // "jasmine",
  "jest",
  "vitest",
];

/*******************************************************************************
 * Node Module Version Limitations
 */

/**
 * TODO: Unable to install latest version because we still use old .eslintrc.js configuration
 * Latest eslint-plugin-sonarjs version is compatible with eslint 9.x which uses eslint.config.json, 
 * while the new config file is not supported yet by eslint-plugin-import.
 */
export const EslintPluginSonarjsVersion = "~0.25.1";


/*******************************************************************************
 * Code Static Stuff
 */

// Build Tools Configs

export const esmModuleHelper = /*js-*/ `const { writeFileSync } = require("fs");
const { join: pathJoin } = require("path");

writeFileSync(pathJoin(__dirname, "..", "dist", "node-esm", "package.json"), JSON.stringify({ type: "module" }));
`;

// TODO: this should disappear and .esbuildrc (or whatever it is named) should be used instead
export const esbuildRunnerJs = /*js-*/ `const babelConfig = require("../.babelrc");
const esbuild = require("esbuild");

(async () => {
  const babelPlugin = (await import("esbuild-plugin-babel")).default;

  // Use \`process.env.BUILD_ENV\` to set the environment
  const buildEnv = process.env.BUILD_ENV || "node-esm"; // Default to 'node-esm'

  await esbuild
    .build({
      entryPoints: ["src/index.js"],
      bundle: true,
      outdir: \`dist/\${buildEnv}\`,
      format: buildEnv === "node-cjs" ? "cjs" : "esm",
      sourcemap: true,
      plugins: [babelPlugin(babelConfig)],
    })
    .catch(() => process.exit(1));
})();
`;

// TODO: this should disappear and .esbuildrc (or whatever it is named) should be used instead
export const esbuildRunnerTs = /*ts-*/ `const esbuild = require("esbuild");

(async () => {
  const babelPlugin = (await import("esbuild-plugin-babel")).default;

  // Use \`process.env.BUILD_ENV\` to set the environment
  const buildEnv = process.env.BUILD_ENV || "node-esm"; // Default to 'node-esm'

  await esbuild
    .build({
      entryPoints: ["src/index.ts"],
      bundle: true,
      outdir: \`dist/\${buildEnv}\`,
      format: buildEnv === "node-cjs" ? "cjs" : "esm",
      sourcemap: true,
    })
    .catch(() => process.exit(1));
})();
`;

// TODO: this should disappear and .swcrc should be used instead
export const swcRunnerJs = /*js-*/ `const { spawn } = require("child_process");
const { mkdirSync, writeFileSync, unlinkSync } = require("fs");
const { dirname, join: pathJoin, relative } = require("path");
const { platform } = require("os");

const buildEnv = process.env.BUILD_ENV || "node-esm";

// generate temporary .swcrc file
const generateSwcrc = () => {
  const config = {
    module: { type: "es6" },
    jsc: {
      parser: { syntax: "ecmascript" },
      transform: null,
      target: "es2020",
      loose: false,
    },
  };
  if (buildEnv === "node-cjs") {
    config.module.type = "commonjs";
  }
  writeFileSync(".swcrc", JSON.stringify(config, null, 2));
};

const outputDir = \`dist/\${buildEnv}\`;

const spawnSwc = async (file, outFile) =>
  new Promise((resolve, reject) => {
    const proc = spawn(
      pathJoin(__dirname, "..", "node_modules", ".bin", \`swc\${platform() !== "win32" ? "" : ".cmd"}\`),
      [file, "-o", outFile],
      {
        stdio: "inherit",
      },
    );

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(\`SWC failed for \${file} with exit code \${code}\`));
      }
    });
  });

const build = async (file) => {
  // Calculate output path
  const outFile = pathJoin(outputDir, relative("src", file));
  const outDir = dirname(outFile);

  // Ensure the directory exists
  console.log(\`Compiling \${file} to \${outFile}\`);
  mkdirSync(outDir, { recursive: true });
  return spawnSwc(file, outFile).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
};

(async () => {
  generateSwcrc();

  await import("globby")
    .then(({ globby }) => globby(["src/**/*.js"]))
    .then((files) => files.filter((file) => !file.endsWith(".test.js") && !file.endsWith(".spec.js")))
    .then((files) => files.map(build))
    .then((promises) => Promise.all(promises));

  unlinkSync(".swcrc");
})();
`;

export const swcRunnerTs = /*ts-*/ `const { spawn } = require("child_process");
const { mkdirSync, writeFileSync, unlinkSync } = require("fs");
const { dirname, join: pathJoin, relative } = require("path");
const { platform } = require("os");

const buildEnv = process.env.BUILD_ENV || "node-esm";

// generate temporary .swcrc file
const generateSwcrc = () => {
  const config = {
    module: { type: "es6" },
    jsc: {
      parser: { syntax: "typescript" },
      transform: null,
      ...(buildEnv !== "browser" ? { target: "es2020" } : {}),
      loose: false,
    },
    ...(buildEnv === "browser"
      ? {
          env: {
            targets: {
              browsers: "> 0.25%, not dead, last 2 versions",
            },
          },
        }
      : {}),
  };
  if (buildEnv === "node-cjs") {
    config.module.type = "commonjs";
  }
  writeFileSync(".swcrc", JSON.stringify(config, null, 2));
};

const outputDir = \`dist/\${buildEnv}\`;

const spawnSwc = async (file, outFile) =>
  new Promise((resolve, reject) => {
    const proc = spawn(
      pathJoin(__dirname, "..", "node_modules", ".bin", \`swc\${platform() !== "win32" ? "" : ".cmd"}\`),
      [file, "-o", outFile],
      {
        stdio: "inherit",
      },
    );

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(\`SWC failed for \${file} with exit code \${code}\`));
      }
    });
  });

const build = async (file) => {
  // Calculate output path
  const outFile = pathJoin(outputDir, relative("src", file.replace(/\.ts$/, ".js")));
  const outDir = dirname(outFile);

  // Ensure the directory exists
  console.log(\`Compiling \${file} to \${outFile}\`);
  mkdirSync(outDir, { recursive: true });
  return spawnSwc(file, outFile).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
};

(async () => {
  generateSwcrc();

  await import("globby")
    .then(({ globby }) => globby(["src/**/*.ts"]))
    .then((files) => files.filter((file) => !file.endsWith(".test.js") && !file.endsWith(".spec.js")))
    .then((files) => files.map(build))
    .then((promises) => Promise.all(promises));

  unlinkSync(".swcrc");
})();
`;

// Test Frameworks Configs

// TODO: this should stay in their own files...

export const avaConfigJs = {
  babel: {
    extensions: ["js"],
    testOptions: {
      babelrc: true,
    },
  },
  extensions: ["js"],
  require: ["@babel/register"],
  files: ["./{src,test}/**/*.{spec,test}.js"],
  environmentVariables: {},
};

export const avaConfigTs = {
  ...avaConfigJs,
  babel: {
    ...avaConfigJs.babel,
    extensions: ["ts"],
  },
  extensions: {
    ts: "module",
  },
  require: ["ts-node/register"],
  files: ["./{src,test}/**/*.{spec,test}.ts"],
  nodeArguments: ["--import=tsimp"],
};

export const jasmineConfigJs = /*js-*/ `require("@babel/register")({
  extensions: [".js", ".jsx"],
});
`;

export const jasmineConfigTs = /*js-*/ `require("@babel/register")({
  extensions: [".js", ".jsx", ".ts", ".tsx"],
});
`;

// Test Code Templates

export const avaSpecJs = /*js-*/ `import test from "ava";
import { hello } from "./index";

test('hello("World") to return "Hello, World!"', (t) => {
  t.is(hello("World"), "Hello, World!");
});
`;

export const avaTestJs = /*js-*/ `/* eslint-disable max-lines-per-function */

import test from "ava";
import sinon from "sinon";

import { writeHello } from "../src";
import { esbuildRunner } from './constants';

test.beforeEach((t) => {
  // Spy on console.log and provide a mock implementation
  t.context.log = console.log;
  console.log = sinon.spy();
});

test.afterEach.always((t) => {
  // Restore console.log to its original implementation after each test
  console.log = t.context.log;
});

test('writeHello("World") to return "Hello, World!"', (t) => {
  writeHello("World");
  t.true(console.log.calledOnce);
  t.true(console.log.calledWith("Hello, World!"));
});
`;

export const avaTestTs = /*ts-*/ `/* eslint-disable max-lines-per-function */

import anyTest, { TestFn } from "ava";
import * as sinon from "sinon";

const test = anyTest as TestFn<{ log: typeof console.log }>;

import { writeHello } from "../src";

test.beforeEach((t) => {
  // Spy on console.log and provide a mock implementation
  t.context = { log: console.log };
  console.log = sinon.spy();
});

test.afterEach.always((t) => {
  // Restore console.log to its original implementation after each test
  console.log = (t.context as any).log;
});

test('writeHello("World") to return "Hello, World!"', (t) => {
  writeHello("World");
  t.true((console.log as any).calledOnce);
  t.true((console.log as any).calledWith("Hello, World!"));
});
`;

export const bunSpecJs = /*js-*/ `// TODO: Implement tests for the "bun" target`;

export const bunTestJs = /*js-*/ `// TODO: Implement tests for the "bun" target`;

export const denoSpecJs = /*js-*/ `// TODO: Implement tests for the "deno" target`;

export const denoTestJs = /*js-*/ `// TODO: Implement tests for the "deno" target`;

export const jasmineSpecJs = /*js-*/ `import { hello } from "./index";

describe("hello", () => {
  it('should return "Hello, World!" when given "World"', () => {
    expect(hello("World")).toEqual("Hello, World!");
  });
});
`;

export const jasmineTestJs = /*js-*/ `/* eslint-disable max-lines-per-function */
import { writeHello } from "../src";
import sinon from "sinon";

describe("writeHello", () => {
  let consoleLogSpy;

  beforeAll(() => {
    consoleLogSpy = sinon.spy(console, "log");
  });

  afterEach(() => {
    // Clear spy call history after each test
    consoleLogSpy.resetHistory();
  });

  afterAll(() => {
    // Restore console.log to its original implementation after all tests
    consoleLogSpy.restore();
  });

  it('should log "Hello, World!" when called with "World"', () => {
    writeHello("World");
    expect(consoleLogSpy.calledOnceWithExactly("Hello, World!")).toBe(true);
  });
});
`;

export const jestSpecJs = /*js-*/ `import { hello } from "./index";

describe("hello", () => {
  it('hello("World") to return "Hello World!"', function () {
    expect(hello("World")).toEqual("Hello, World!");
  });
});
`;

export const jestTestJs = /*js-*/ `/* eslint-disable max-lines-per-function */
import { writeHello } from "../src";

describe("writeHello", () => {
  let consoleSpy;

  beforeAll(() => {
    // Spy on console.log and provide a mock implementation
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Clear mock call history after each test
    consoleSpy.mockClear();
  });

  afterAll(() => {
    // Restore console.log to its original implementation after all tests
    consoleSpy.mockRestore();
  });

  it('writeHello("World") to return "Hello, World!"', () => {
    writeHello("World");
    expect(console.log).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("Hello, World!");
  });
});
`;

export const jestTestTs = /*ts-*/ `/* eslint-disable max-lines-per-function */
import { writeHello } from "../src";

describe("writeHello", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleSpy: any;

  beforeAll(() => {
    // Spy on console.log and provide a mock implementation
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Clear mock call history after each test
    consoleSpy.mockClear();
  });

  afterAll(() => {
    // Restore console.log to its original implementation after all tests
    consoleSpy.mockRestore();
  });

  it('writeHello("World") to return "Hello, World!"', () => {
    writeHello("World");
    expect(console.log).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("Hello, World!");
  });
});
`;

export const mochaSpecJs = /*js-*/ `import { hello } from "./index";

describe("hello", function () {
  it('should return "Hello, World!" when given "World"', () => {
    expect(hello("World")).to.equal("Hello, World!");
  });
});
`;

export const mochaSpecTs = /*ts-*/ `import { expect } from "chai";

import { hello } from "./index";

describe("hello", function () {
  it('should return "Hello, World!" when given "World"', () => {
    expect(hello("World")).to.equal("Hello, World!");
  });
});
`;

export const mochaTestJs = /*js-*/ `/* eslint-disable max-lines-per-function */
import sinon from "sinon";

import { writeHello } from "../src";

describe("writeHello", function () {
  let consoleLogStub;

  beforeEach(function () {
    // Stub console.log
    consoleLogStub = sinon.stub(console, "log");
    // Prevent console.log from printing
    consoleLogStub.returns();
  });

  afterEach(function () {
    // Restore the original console.log function
    consoleLogStub.restore();
  });

  it('should log "Hello, World!" when called with "World"', function () {
    writeHello("World");
    sinon.assert.calledOnce(consoleLogStub);
    sinon.assert.calledWithExactly(consoleLogStub, "Hello, World!");
  });
});
`;

export const mochaTestTs = /*ts-*/ `/* eslint-disable max-lines-per-function */
import { expect } from "chai";
import sinon from "sinon";

import { writeHello } from "../src";

describe("writeHello", function () {
  let consoleLogStub;

  beforeEach(function () {
    // Stub console.log
    consoleLogStub = sinon.stub(console, "log");
    // Prevent console.log from printing
    consoleLogStub.returns();
  });

  afterEach(function () {
    // Restore the original console.log function
    consoleLogStub.restore();
  });

  it('should log "Hello, World!" when called with "World"', function () {
    writeHello("World");
    sinon.assert.calledOnce(consoleLogStub);
    sinon.assert.calledWithExactly(consoleLogStub, "Hello, World!");
  });
});
`;

export const vitestSpecJs = /*js-*/ `import {test, expect} from 'vitest';

import {hello} from './index';

test("hello('World') should return 'Hello, World!'", () => {
  expect(hello('World')).toBe('Hello, World!');
});
`;

export const vitestTestJs = /*js-*/ `/* eslint-disable max-lines-per-function */
import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from "vitest";

import { writeHello } from "../src";

describe("writeHello", () => {
  let consoleMock;

  beforeAll(() => {
    consoleMock = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleMock.mockClear();
  });

  afterAll(() => {
    consoleMock.mockReset();
  });

  it('writeHello("World") to return "Hello, World!"', () => {
    // Call the function under test
    writeHello("World");

    // Assert that console.log was called once with the expected argument
    expect(consoleMock).toHaveBeenCalledOnce();
    expect(consoleMock).toHaveBeenLastCalledWith("Hello, World!");
  });
});
`;

// Code Templates

export const codeJs = /*js-*/ `export const hello = (who) => \`Hello, \${who}!\`;

export const writeHello = (who) => console.log(hello(who));
`;

export const codeTs = /*ts-*/ `export const hello = (who: string): string => \`Hello, \${who}!\`;

export const writeHello = (who: string): void => console.log(hello(who));
`;
