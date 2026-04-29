export default {
  // Use ts-jest to transform TypeScript and JS (including .mjs) so ESM packages
  // like `uuid` can be transpiled for Jest. We also allow transforming specific
  // node_modules entries via transformIgnorePatterns below.
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
    '^.+\\.m?js$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  collectCoverageFrom: ['server/**/*.{ts,js,jsx,mjs}'],
  testMatch: ['<rootDir>/(server|job)/**/?(*.)(cy|test).{ts,js,jsx,mjs}'],
  testEnvironment: 'node',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test_results/jest/',
      },
    ],
    [
      './node_modules/jest-html-reporter',
      {
        outputPath: 'test_results/unit-test-reports.html',
      },
    ],
  ],
  moduleFileExtensions: ['web.js', 'js', 'json', 'node', 'ts'],
  // By default node_modules are ignored by transformers. uuid@14 ships as ESM
  // and uses `export ...` syntax which Jest (without transforming) cannot
  // parse. Allow transforming uuid (and add other packages here if needed).
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  // Use a dedicated tsconfig for Jest (tsconfig.jest.json) that enables allowJs
  // so .js/.mjs files (including transformed node_modules like `uuid`) are
  // compiled. See tsconfig.jest.json in the repo.
}
