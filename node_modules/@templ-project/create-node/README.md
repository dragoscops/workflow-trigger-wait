# @templ-project/create-node

> Create Node modules with ease! `@templ-project/create-node` is a CLI tool designed to bootstrap Node.js projects with best practices in mind. It supports both JavaScript and TypeScript, along with a variety of build tools, testing frameworks, package managers, and quality tools to suit your development needs.

- [@templ-project/create-node](#templ-projectcreate-node)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Arguments](#arguments)
  - [Example](#example)
  - [Contributing](#contributing)
  - [License](#license)

## Features

- **Language Support**: Choose between JavaScript and TypeScript for your project.
- **Module Targets**: Generate projects for specific environments like the browser, Bun, Deno, Node.js (CJS), Node.js (ESM), or all.
- **Package Managers**: Support for npm, pnpm, and yarn to manage your dependencies.
- **Testing Frameworks**: Integrated setup for popular testing frameworks including AVA, Deno, Mocha, Jasmine, Jest, and Vitest.
- **Quality Tools**: Option to include ESLint, Prettier, JSCPD, Dependency Cruiser, License Checker, Audit, and more for maintaining code quality.
- **Build Tools**: Choose from ESBuild, Rollup, or SWC for building your project.

## Installation

This tool is meant to be run with npx, so there's no need for a global installation. Simply run the following command to start creating your Node module:

```bash
npx @templ-project/create-node <projectPath>
```

## Usage

After installation, you can create a new Node module by specifying the project path and customizing your setup with various options:

```bash
npx @templ-project/create-node [options] <projectPath>
```

## Arguments

```
npx @templ-project/create-node --help

Usage: create-node [options] <projectPath>

Arguments:
  projectPath                        Project Path

Options:
  -l, --language <language>          Programming Language to use: js, ts (default: "ts")
  -t, --targets <targets...>         Module's target: browser, bun, deno, node-cjs, node-esm or all (default: "all")
  --package-manager <packageManger>  Package Manager to use: npm, pnpm, yarn (default: "npm")
  --test-framework <testFramework>   Testing Framework to use: ava, deno, mocha, jasmine, jest, vitest (default: "jest")
  --quality-tools <qualityTools...>  Quality Tools to use: eslint, oxlint, prettier, jscpd, dependency-cruiser, license-checker, audit or all (default: "all")
  --build-tool <buildTool>           Build Tool to use: esbuild, rollup, swc
  -h, --help                         display help for command
```

## Example

Create a TypeScript project with Jest for testing, ESLint and Prettier for code quality, using npm as the package manager:

```bash
npx @templ-project/create-node -l ts --test-framework jest --quality-tools eslint prettier --package-manager npm my-awesome-project
```

## Contributing

Contributions are welcome! If you'd like to help improve @templ-project/create-node, please fork the repository and submit a pull request.

## License

This project is licensed under MIT License. See the LICENSE file for more details.
