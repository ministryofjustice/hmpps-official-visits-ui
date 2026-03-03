import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs } from '../testUtils'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import manageUsersApi from '../mockApis/manageUsersApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'

test.describe('Admin add time slot', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await manageUsersApi.stubGetByUsername()
    await officialVisitsApi.stubCreateTimeSlot({})
    await officialVisitsApi.stubTimeSlotSummary({
      prisonCode: 'MDI',
      prisonName: 'Moorland',
      timeSlots: [
        {
          timeSlot: {
            dayCode: 'MON',
            prisonTimeSlotId: 1,
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
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('should allow admin to add a new Monday time slot and show success banner', async ({ page }) => {
    // Login as ADMIN
    await login(page, {
      name: 'AdminUser',
      roles: [`ROLE_${AuthorisedRoles.ADMIN}`, `ROLE_${AuthorisedRoles.DEFAULT}`],
      active: true,
      authSource: 'nomis',
    })

    // Go to admin days page
    await page.goto('/admin/days')

    const addMondayLink = page.getByRole('button', { name: 'Add Monday time' })
    await expect(addMondayLink).toBeVisible()

    await addMondayLink.click()

    await expect(page.getByRole('heading', { name: 'Add a new time for Monday' })).toBeVisible()

    await page.fill('input[name="startTime-startHour"]', '10')
    await page.fill('input[name="startTime-startMinute"]', '00')
    await page.fill('input[name="endTime-endHour"]', '11')
    await page.fill('input[name="endTime-endMinute"]', '00')

    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    const effectiveDate = `${dd}/${mm}/${yyyy}`

    if (await page.locator('input[name="startDate"]').count()) {
      await page.fill('input[name="startDate"]', effectiveDate)
    }
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('New time for visit created')).toBeVisible()
    await expect(
      page.getByText(
        'You have created a new visiting time in your prisons schedule. To add locations and capacities for this visit select manage locations.',
      ),
    ).toBeVisible()
  })
})
