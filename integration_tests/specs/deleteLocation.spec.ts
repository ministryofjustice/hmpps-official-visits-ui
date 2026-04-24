import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs } from '../testUtils'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import manageUsersApi from '../mockApis/manageUsersApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import { TimeSlot, TimeSlotSummaryItem, VisitLocation, VisitSlot } from '../../server/@types/officialVisitsApi/types'
import {
  visitSlotNoVisits,
  visitSlotWithVisits,
  prisonTimeSlot,
  visitLocations,
  timeSlotSummaryNoVisits,
  timeSlotWithVisits,
} from './mocks'

const setupStubs = async (timeSlotSummary: TimeSlotSummaryItem, visitSlot: VisitSlot) => {
  await officialVisitsApi.stubGetPrisonTimeSlotSummaryById(1, timeSlotSummary)
  await officialVisitsApi.stubGetVisitSlot(1, visitSlot)
  await officialVisitsApi.stubGetPrisonTimeSlotById(1, prisonTimeSlot as TimeSlot)
  await officialVisitsApi.stubGetOfficialVisitLocationsAtPrison('LEI', visitLocations as VisitLocation[])
}

test.skip('Admin: Delete a location', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await manageUsersApi.stubGetByUsername()
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('should allow admin to delete a location', async ({ page }) => {
    // Login as admin
    await login(page, {
      name: 'AdminUser',
      roles: [`ROLE_${AuthorisedRoles.ADMIN}`, `ROLE_${AuthorisedRoles.DEFAULT}`],
      active: true,
      authSource: 'nomis',
    })

    await setupStubs(timeSlotSummaryNoVisits, visitSlotNoVisits)

    // Stub delete visit slot
    await officialVisitsApi.stubDeleteVisitSlot(1)

    await page.goto('/admin/time-slot/1/locations')

    await page.getByRole('link', { name: 'Delete' }).click()

    await expect(page).toHaveURL('/admin/time-slot/1/location/1/delete')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Are you sure you want to delete this location/)

    await expect(page.getByText('Room 1')).toBeVisible()

    // Submit the form to delete
    await page.getByRole('button', { name: 'Delete' }).click()

    await expect(page).toHaveURL('/admin/time-slot/1/location')

    await expect(page.getByText('Location for visit deleted')).toBeVisible()
    await expect(
      page.getByText(
        `You have deleted a location for a visiting time in your prison's schedule. Return to DPS home page`,
      ),
    ).toBeVisible()
  })

  test('delete link should not be visible if there are visits booked for a location', async ({ page }) => {
    await login(page, {
      name: 'AdminUser',
      roles: [`ROLE_${AuthorisedRoles.ADMIN}`, `ROLE_${AuthorisedRoles.DEFAULT}`],
      active: true,
      authSource: 'nomis',
    })

    await setupStubs(timeSlotWithVisits, visitSlotWithVisits)

    await officialVisitsApi.stubDeleteVisitSlot(1)

    await page.goto('/admin/time-slot/1/locations')

    await expect(page.getByText('Room 1')).toBeVisible()

    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Delete' })).not.toBeVisible()
  })
})
