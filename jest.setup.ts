// jest.setup.ts
import '@actions/core';

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
}));

console.error = jest.fn();
console.log = jest.fn();
console.warn = jest.fn();
