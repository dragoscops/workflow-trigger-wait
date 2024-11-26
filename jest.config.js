// jest.config.js

module.exports = {
  clearMocks: true,
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['js', 'ts', 'json', 'tsx'],
  roots: ['.'],
  testEnvironment: 'node',
  testMatch: ['**/{src,test}/**/*.{spec,test}.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
