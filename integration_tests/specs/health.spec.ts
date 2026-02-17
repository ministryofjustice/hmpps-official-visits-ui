import { expect, test } from '@playwright/test'
import exampleApi from '../mockApis/exampleApi'
import hmppsAuth from '../mockApis/hmppsAuth'
import tokenVerification from '../mockApis/tokenVerification'

import { resetStubs } from '../testUtils'
import locationsInsidePrisonApi from '../mockApis/locationsInsidePrisonApi'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import personalRelationshipsApi from '../mockApis/personalRelationshipsApi'
import prisonApi from '../mockApis/prisonApi'
import activitiesApi from '../mockApis/activitiesApi'
import manageUsersApi from '../mockApis/manageUsersApi'

test.describe('Health', () => {
  test.afterEach(async () => {
    await resetStubs()
  })

  test.describe('All healthy', () => {
    test.beforeEach(async () => {
      await Promise.all([
        hmppsAuth.stubPing(),
        tokenVerification.stubPing(),
        locationsInsidePrisonApi.stubPing(),
        prisonApi.stubPing(),
        personalRelationshipsApi.stubPing(),
        officialVisitsApi.stubPing(),
        prisonerSearchApi.stubPing(),
        activitiesApi.stubPing(),
        manageUsersApi.stubPing(),
      ])
    })

    test('Health check is accessible and status is UP', async ({ page }) => {
      const response = await page.request.get('/health')
      const payload = await response.json()
      expect(payload.status).toBe('UP')
    })

    test('Ping is accessible and status is UP', async ({ page }) => {
      const response = await page.request.get('/ping')
      const payload = await response.json()
      expect(payload.status).toBe('UP')
    })

    test('Info is accessible', async ({ page }) => {
      const response = await page.request.get('/info')
      const payload = await response.json()
      expect(payload.build.name).toBe('hmpps-official-visits-ui')
    })
  })

  test.describe('Some unhealthy', () => {
    test.beforeEach(async () => {
      await Promise.all([hmppsAuth.stubPing(), exampleApi.stubPing(), tokenVerification.stubPing(500)])
    })

    test('Health check status is down', async ({ page }) => {
      const response = await page.request.get('/health')
      const payload = await response.json()
      expect(payload.status).toBe('DOWN')
      expect(payload.components.hmppsAuth.status).toBe('UP')
      expect(payload.components.tokenVerification.status).toBe('DOWN')
      expect(payload.components.tokenVerification.details.status).toBe(500)
      expect(payload.components.tokenVerification.details.attempts).toBe(3)
    })
  })
})
