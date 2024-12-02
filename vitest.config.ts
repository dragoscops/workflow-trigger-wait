// vitest.config.ts

import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    // Equivalent to Jest's clearMocks: true
    clearMocks: true,

    // Coverage Configuration
    coverage: {
      // Directory where coverage reports will be stored
      reportsDirectory: 'coverage',

      // Coverage provider; 'istanbul' is the default and widely supported
      provider: 'istanbul',

      // Specify the reporters you want
      // Options include 'text', 'json', 'html', etc.
      reporter: ['text', 'json', 'html'],

      // Include all files in coverage analysis
      // Adjust the patterns as needed
      include: ['src/**/*.{ts,tsx,js,jsx}'],

      // Exclude specific files or directories from coverage
      exclude: ['**/*.d.ts', 'node_modules'],
    },

    // Environment similar to Jest's testEnvironment: 'node'
    environment: 'node',

    // Patterns Jest uses to detect test files
    // Equivalent to Jest's testMatch
    include: ['**/{src,test}/**/*.{spec,test}.ts'],

    // Optionally, you can enable globals to use Jest-like globals (e.g., describe, it)
    globals: true,

    // Optionally, you can specify the cache directory
    // cacheDir: './node_modules/.vitest',

    // Enable TypeScript support (handled automatically by Vitest)
    // No need for transform settings like Jest's ts-jest
  },
});
