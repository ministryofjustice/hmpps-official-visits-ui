import { defineConfig } from 'cypress'
import { resetStubs } from './integration_tests/mockApis/wiremock'

import auth from './integration_tests/mockApis/auth'
import tokenVerification from './integration_tests/mockApis/tokenVerification'
import componentsApi from './integration_tests/mockApis/componentsApi'
import locationsInPrisonApi from './integration_tests/mockApis/locationsInPrisonApi'
import prisonerSearchApi from './integration_tests/mockApis/prisonerSearchApi'
import officialVisitsApi from './integration_tests/mockApis/officialVisitsApi'

export default defineConfig({
  chromeWebSecurity: false,
  fixturesFolder: 'integration_tests/fixtures',
  screenshotsFolder: 'integration_tests/screenshots',
  videosFolder: 'integration_tests/videos',
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    configFile: 'reporter-config.json',
  },
  taskTimeout: 60000,
  e2e: {
    setupNodeEvents(on) {
      on('task', {
        reset: resetStubs,
        ...auth,
        ...tokenVerification,
        ...componentsApi,
        ...locationsInPrisonApi,
        ...prisonerSearchApi,
        ...officialVisitsApi,
      })
    },
    baseUrl: 'http://localhost:3007',
    excludeSpecPattern: ['dist', '**/!(*.cy).ts'],
    specPattern: '**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'integration_tests/support/index.ts',
    experimentalRunAllSpecs: true,
    retries: {
      runMode: 2,
    },
  },
})
