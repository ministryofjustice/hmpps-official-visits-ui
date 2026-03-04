import { expect, Page, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs } from '../testUtils'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import manageUsersApi from '../mockApis/manageUsersApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import { apiMock, simpleApiMock } from '../testHelpers'

async function loginAsAdmin(page: Page) {
  await login(page, {
    name: 'AdminUser',
    roles: [`ROLE_${AuthorisedRoles.ADMIN}`, `ROLE_${AuthorisedRoles.DEFAULT}`],
    active: true,
    authSource: 'nomis',
  })
}

test.describe('Admin edit time slot', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await manageUsersApi.stubGetByUsername()
    // stub admin time slot summary with a MON slot including a prisonTimeSlotId of 3
    await officialVisitsApi.stubTimeSlotSummary({
      prisonCode: 'MDI',
      prisonName: 'Moorland',
      timeSlots: [
        {
          timeSlot: {
            dayCode: 'MON',
            prisonTimeSlotId: 3,
            startTime: '09:00',
            endTime: '10:00',
            effectiveDate: '2026-01-01',
            expiryDate: null,
            prisonCode: 'MDI',
            createdBy: 'test',
            createdTime: '2026-01-01T09:00:00',
          },
          visitSlots: [],
        },
      ],
    })

    await simpleApiMock(`/official-visits-api/admin/time-slot/3`, {
      prisonTimeSlotId: 3,
      startTime: '09:00',
      endTime: '10:00',
      effectiveDate: '2026-01-01',
      expiryDate: null,
      prisonCode: 'MDI',
    })

    await apiMock('PUT', `/official-visits-api/admin/time-slot/3`, {})
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('should allow admin to edit an existing Monday time slot and show success banner', async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto('/admin/days')

    const mondayTab = page.getByRole('tab', { name: 'Monday' })
    if (await mondayTab.count()) {
      await mondayTab.click()
    }

    const editLink = page.locator('a[href*="/admin/locations/time-slot/3/edit"]')
    await expect(editLink).toBeVisible()
    await editLink.click()

    await expect(page.getByRole('heading', { name: 'Edit a time for Monday' })).toBeVisible()

    await page.fill('input[name="startDate"]', new Date().toISOString().split('T')[0])
    await page.fill('input[name="startTime-startHour"]', '11')
    await page.fill('input[name="startTime-startMinute"]', '15')
    await page.fill('input[name="endTime-endHour"]', '12')
    await page.fill('input[name="endTime-endMinute"]', '30')

    await Promise.all([page.waitForURL('**/admin/days'), page.getByRole('button', { name: 'Save' }).click()])

    await expect(page.getByText('You have updated a visiting time')).toBeVisible()
  })

  test('should show validation error when start date is in the past', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/days')

    const mondayTab = page.getByRole('tab', { name: 'Monday' })
    if (await mondayTab.count()) {
      await mondayTab.click()
    }

    const editLink = page.locator('a[href*="/admin/locations/time-slot/3/edit"]')
    await expect(editLink).toBeVisible()
    await editLink.click()

    await expect(page.getByRole('heading', { name: 'Edit a time for Monday' })).toBeVisible()

    await page.fill('input[name="startTime-startHour"]', '11')
    await page.fill('input[name="startTime-startMinute"]', '15')
    await page.fill('input[name="endTime-endHour"]', '12')
    await page.fill('input[name="endTime-endMinute"]', '30')

    await page.getByRole('button', { name: 'Save' }).click()

    await expect(
      page.getByRole('link', { name: 'Select a date that is today or in the future for the start date' }),
    ).toBeVisible()
  })
})
