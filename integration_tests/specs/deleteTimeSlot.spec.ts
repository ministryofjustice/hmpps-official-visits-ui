import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs } from '../testUtils'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import manageUsersApi from '../mockApis/manageUsersApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import { TimeSlot, TimeSlotSummary, VisitLocation, VisitSlot } from '../../server/@types/officialVisitsApi/types'
import {
  timeSlotSummaryWithVisits,
  visitSlotNoVisits,
  visitSlotWithVisits,
  prisonTimeSlot,
  visitLocations,
  timeSlotSummaryNoVisitSlots,
} from './mocks'

const setupStubs = async (timeSlotSummary: TimeSlotSummary, visitSlot: VisitSlot) => {
  await officialVisitsApi.stubGetAllTimeSlotsAndVisitSlots(timeSlotSummary)
  await officialVisitsApi.stubGetVisitSlot(1, visitSlot)
  await officialVisitsApi.stubGetPrisonTimeSlotById(1, prisonTimeSlot as TimeSlot)
  await officialVisitsApi.stubGetOfficialVisitLocationsAtPrison('LEI', visitLocations as VisitLocation[])
}

test.describe('Admin: Delete a time slot', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await manageUsersApi.stubGetByUsername()
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('should allow admin to delete a time slot', async ({ page }) => {
    // Login as admin
    await login(page, {
      name: 'AdminUser',
      roles: [`ROLE_${AuthorisedRoles.ADMIN}`, `ROLE_${AuthorisedRoles.DEFAULT}`],
      active: true,
      authSource: 'nomis',
    })

    await setupStubs(
      timeSlotSummaryNoVisitSlots as unknown as TimeSlotSummary,
      visitSlotNoVisits as unknown as VisitSlot,
    )

    await officialVisitsApi.stubDeleteTimeSlot(1)

    await page.goto('/admin/days')

    await page.getByRole('link', { name: 'Delete' }).click()

    await expect(page).toHaveURL(/\/admin\/locations\/time-slot\/1\/delete/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Are you sure you want to delete this visiting time/,
    )

    // Submit the form to delete
    await page.getByRole('button', { name: 'Delete' }).click()

    await expect(page).toHaveURL('/admin/days#monday')

    await expect(page.getByText('Visiting time deleted')).toBeVisible()
    await expect(
      page.getByText('You have deleted a visiting time in your prisons schedule. Return to DPS home page'),
    ).toBeVisible()
  })

  test('delete link should not be visible if there are visit slots for a time slot', async ({ page }) => {
    await login(page, {
      name: 'AdminUser',
      roles: [`ROLE_${AuthorisedRoles.ADMIN}`, `ROLE_${AuthorisedRoles.DEFAULT}`],
      active: true,
      authSource: 'nomis',
    })

    await setupStubs(
      timeSlotSummaryWithVisits as unknown as TimeSlotSummary,
      visitSlotWithVisits as unknown as VisitSlot,
    )

    await page.goto('/admin/days')

    await expect(page.getByRole('link', { name: 'Delete' })).not.toBeVisible()
  })
})
