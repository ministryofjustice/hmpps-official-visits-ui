import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs } from '../testUtils'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import manageUsersApi from '../mockApis/manageUsersApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import { TimeSlot, TimeSlotSummary, VisitLocation } from '../../server/@types/officialVisitsApi/types'

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

    // Provide a minimal time slot summary containing the time slot with id 1 and prison LEI
    const timeSlotSummaryForTest = {
      prisonCode: 'LEI',
      prisonName: 'Leeds (HMP)',
      timeSlots: [
        {
          timeSlot: {
            prisonTimeSlotId: 1,
            prisonCode: 'LEI',
            dayCode: 'MON',
            startTime: '09:00',
            endTime: '10:00',
            effectiveDate: '2026-01-01',
            expiryDate: '2026-12-31',
            createdBy: 'TEST_USER',
            createdTime: '2026-01-01T09:00:00Z',
            updatedBy: 'TEST_USER',
            updatedTime: '2026-01-02T10:00:00Z',
          },
          visitSlots: [
            {
              visitSlotId: 1,
              dpsLocationId: 1,
              locationDescription: 'Room 1',
              maxAdults: 2,
              maxGroups: 1,
              maxVideo: 0,
            },
          ],
        },
      ],
    }

    await officialVisitsApi.stubGetAllTimeSlotsAndVisitSlots(timeSlotSummaryForTest as unknown as TimeSlotSummary)
    await officialVisitsApi.stubGetPrisonTimeSlotById(1, {
      prisonTimeSlotId: 1,
      dayCode: 'MON',
      effectiveDate: '2024-01-01',
      expiryDate: '2025-01-01',
      startTime: '10:00',
      endTime: '11:00',
    } as TimeSlot)

    // Stub create visit slot POST
    await officialVisitsApi.stubUpdateVisitSlot('1')
    await officialVisitsApi.stubGetOfficialVisitLocationsAtPrison('LEI', [
      { locationId: 'loc-1', locationName: 'Visit room 1' },
      { locationId: 'loc-2', locationName: 'Visit room 2' },
    ] as VisitLocation[])

    await page.goto('/admin/locations/time-slot/1/location')

    await page.getByRole('link', { name: 'Manage location' }).click()

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
