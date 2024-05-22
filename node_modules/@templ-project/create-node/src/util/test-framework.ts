export const requiresNyc = (testFramework: string): boolean =>
  ["ava", "jasmine", "mocha"].includes(testFramework);

export const requiresSinon = (testFramework: string): boolean =>
  ["ava", "jasmine", "mocha"].includes(testFramework);
