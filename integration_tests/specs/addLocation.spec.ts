import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs } from '../testUtils'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import manageUsersApi from '../mockApis/manageUsersApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import { getMatchingRequests } from '../mockApis/wiremock'
import { TimeSlot, TimeSlotSummaryItem, VisitLocation } from '../../server/@types/officialVisitsApi/types'
import { prisonTimeSlot, visitLocations, timeSlotSummaryNoVisits } from './mocks'

test.describe('Admin: Add a new location', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await manageUsersApi.stubGetByUsername()
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('should allow admin to add a new location', async ({ page }) => {
    // Login as admin
    await login(page, {
      name: 'AdminUser',
      roles: [`ROLE_${AuthorisedRoles.ADMIN}`, `ROLE_${AuthorisedRoles.DEFAULT}`],
      active: true,
      authSource: 'nomis',
    })

    // Provide a minimal time slot summary containing the time slot with id 1 and prison LEI
    await officialVisitsApi.stubGetPrisonTimeSlotSummaryById(
      1,
      timeSlotSummaryNoVisits as unknown as TimeSlotSummaryItem,
    )
    await officialVisitsApi.stubGetPrisonTimeSlotById(1, prisonTimeSlot as TimeSlot)

    // Stub create visit slot POST
    await officialVisitsApi.stubCreateVisitSlot(1, {
      visitSlotId: 99,
      locationDescription: 'Visit room 1',
      maxAdults: 5,
      maxGroups: 2,
      maxVideo: 0,
    })
    await officialVisitsApi.stubGetOfficialVisitLocationsAtPrison('LEI', visitLocations as VisitLocation[])

    // Go to the locations page for time slot 1
    await page.goto('/admin/locations/time-slot/1/location')

    // Click the Add a new location button
    await page.getByRole('button', { name: 'Add a new location' }).click()

    // Verify we're on the add page
    await expect(page).toHaveURL(/\/admin\/locations\/time-slot\/1\/visit-slot\/new/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Add new location/)

    // Select location and fill capacities
    await page.locator('select[name="dpsLocationId"]').selectOption('loc-1')
    await page.fill('input[name="maxAdults"]', '5')
    await page.fill('input[name="maxGroups"]', '2')
    await page.fill('input[name="maxVideo"]', '0')

    // Submit the form
    await page.getByRole('button', { name: 'Save' }).click()

    // After submit ensure we've returned to locations page
    await expect(page).toHaveURL('/admin/locations/time-slot/1/location')

    // Verify wiremock saw the POST request
    const reqs = await getMatchingRequests({ method: 'POST', url: '/official-visits-api/admin/time-slot/1/visit-slot' })
    // Expect at least one request matching
    expect(reqs.body.requests.length).toBeGreaterThan(0)
    // Verify the request body contains our dpsLocationId
    const posted = reqs.body.requests[0].body
    expect(posted).toContain('loc-1')
    await expect(page.getByText('New location for visit created')).toBeVisible()
    await expect(
      page.getByText(
        `You have created a new location for visiting time in your prison's schedule. Return to DPS home page`,
      ),
    ).toBeVisible()
  })
})
