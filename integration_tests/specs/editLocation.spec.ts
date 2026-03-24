import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs } from '../testUtils'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import manageUsersApi from '../mockApis/manageUsersApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import { TimeSlot, TimeSlotSummaryItem, VisitLocation, VisitSlot } from '../../server/@types/officialVisitsApi/types'
import { visitSlotNoVisits, visitLocations, prisonTimeSlot, timeSlotSummaryNoVisits } from './mocks'

test.describe('Admin: Edit a location', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await manageUsersApi.stubGetByUsername()
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('should allow admin to edit a location', async ({ page }) => {
    // Login as admin
    await login(page, {
      name: 'AdminUser',
      roles: [`ROLE_${AuthorisedRoles.ADMIN}`, `ROLE_${AuthorisedRoles.DEFAULT}`],
      active: true,
      authSource: 'nomis',
    })

    await officialVisitsApi.stubGetPrisonTimeSlotSummaryById(
      1,
      timeSlotSummaryNoVisits as unknown as TimeSlotSummaryItem,
    )
    await officialVisitsApi.stubGetVisitSlot(1, visitSlotNoVisits as unknown as VisitSlot)
    await officialVisitsApi.stubGetPrisonTimeSlotById(1, prisonTimeSlot as TimeSlot)
    await officialVisitsApi.stubGetOfficialVisitLocationsAtPrison('LEI', visitLocations as VisitLocation[])

    // Stub create visit slot POST
    await officialVisitsApi.stubUpdateVisitSlot(1)
    await officialVisitsApi.stubGetOfficialVisitLocationsAtPrison('LEI', visitLocations as VisitLocation[])

    await page.goto('/admin/locations/time-slot/1/location')

    await page.getByRole('link', { name: 'Edit' }).click()

    await expect(page).toHaveURL(/\/admin\/locations\/time-slot\/1\/visit-slot\/1/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Edit location/)

    await expect(page.getByText('Visit location Room 1')).toBeVisible()
    await page.fill('input[name="maxAdults"]', '5')
    await page.fill('input[name="maxGroups"]', '2')
    await page.fill('input[name="maxVideo"]', '0')

    // Submit the form
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page).toHaveURL('/admin/locations/time-slot/1/location')

    await expect(page.getByText('Location for visit updated')).toBeVisible()
    await expect(
      page.getByText(
        'You have updated the location for visiting time in your prisons schedule. Return to DPS home page',
      ),
    ).toBeVisible()
  })
})
