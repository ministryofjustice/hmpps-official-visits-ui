import hmppsConfig from '@ministryofjustice/eslint-config-hmpps'

export default [
  ...hmppsConfig({
    extraIgnorePaths: ['assets'],
    extraPathsAllowingDevDependencies: ['.allowed-scripts.mjs'],
  }),
  {
    rules: {
      'dot-notation': 'off',
      'import/prefer-default-export': 0,
      'no-param-reassign': 0,
    },
  },
]
