import { expect, test } from '@playwright/test'
import { format } from 'date-fns'
import hmppsAuth from '../mockApis/hmppsAuth'
import manageUsersApi from '../mockApis/manageUsersApi'
import { login, resetStubs, setupFindByCriteriaStubs } from '../testUtils'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import componentsApi from '../mockApis/componentsApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import personalRelationshipsApi from '../mockApis/personalRelationshipsApi'
import prisonApi from '../mockApis/prisonApi'
import ListVisitsPage from '../pages/listVisitsPage'
import {
  mockOfficialVisitors,
  mockPrisonerRestrictions,
  mockSocialVisitors,
  mockVisitByIdVisit,
  mockVisitByIdVisitContact,
} from '../../server/testutils/mocks'
import ViewVisitPage from '../pages/viewVisitPage'
import CancelVisitPage from '../pages/cancelVisitPage'
import NotificationEmailPage from '../pages/notificationEmailPage'
import { completionCodes, locations, mockPrisoner, searchLevels, statuses, visitTypes } from '../mockData/data'
import { OfficialVisitNotifications } from '../../server/@types/officialVisitsApi/types'

test.describe('Cancel an official visit', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await manageUsersApi.stubGetByUsername()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await prisonerSearchApi.stubGetByPrisonerNumber(mockPrisoner)
    await personalRelationshipsApi.stubRestrictions({ content: mockPrisonerRestrictions })
    await officialVisitsApi.stubAllContacts([...mockOfficialVisitors, ...mockSocialVisitors, mockVisitByIdVisitContact])
    await prisonerSearchApi.stubSearchInCaseload({
      content: [mockPrisoner],
      first: true,
      last: false,
      number: 1,
      totalPages: 1,
    })
    await officialVisitsApi.stubRefData('VIS_TYPE', visitTypes)
    await officialVisitsApi.stubRefData('VIS_STATUS', statuses)
    await officialVisitsApi.stubRefData('VIS_COMPLETION', completionCodes)
    await officialVisitsApi.stubRefData('SEARCH_LEVEL', searchLevels)
    await officialVisitsApi.stubAvailableSlots(
      locations.map(o => {
        return {
          visitSlotId: 1,
          timeSlotId: 1,
          prisonCode: 'MDI',
          dayCode: 'WED',
          dayDescription: 'Wednesday',
          startTime: '08:00',
          endTime: '17:00',
          dpsLocationId: o.code,
          locationDescription: o.description,
          availableAdults: 1,
          availableGroups: 1,
          availableVideoSessions: 1,
          visitDate: format(new Date(), 'yyyy-MM-dd'),
        }
      }),
    )

    await setupFindByCriteriaStubs()
    await officialVisitsApi.stubGetVisitChangeStatus({ hasChanged: false })
    await officialVisitsApi.stubGetOfficialVisitById(mockVisitByIdVisit)
    await officialVisitsApi.stubCompleteVisit({})
    await officialVisitsApi.stubCancelVisit({})
    await personalRelationshipsApi.stubRelationship(7332364)
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('Happy path', async ({ page }) => {
    await login(page)
    await page.goto(`/view/list`)
    const visitListPage = await ListVisitsPage.verifyOnPage(page)

    // Navigate to the first visit in the list
    await visitListPage.page.getByRole('link', { name: 'Select' }).first().click()

    // Verify we're on the visit page
    await ViewVisitPage.verifyOnPage(page)

    // Start cancellation journey
    await page.getByRole('link', { name: 'Cancel visit' }).click()
    await CancelVisitPage.verifyOnPage(page)

    expect(page.url()).toContain('http://localhost:3007/view/visit/1/cancel')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('link', { name: 'Select a cancellation reason' }).click()
    await page.getByRole('radio', { name: 'Cancelled by visitor' }).click()
    await page.getByLabel('Extra information (optional)').fill('Changed plans')

    // Submit cancellation
    await page.getByRole('button', { name: 'Continue' }).click()

    // Assert we've returned to the visit page and see the success region
    expect(page.url()).toContain('http://localhost:3007/view/visit/1?backTo=')
    await expect(page.getByRole('region', { name: 'success: Visit cancelled' })).toBeVisible()
    await expect(page.getByText('You have cancelled this visit.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Return to search list' })).toBeVisible()
  })

  test('Success banner shows email confirmation actions when email notifications are enabled', async ({ page }) => {
    await officialVisitsApi.getNotificationsByOfficialVisitId(1, [
      { emailAddress: 'visitor@example.com' },
    ] as OfficialVisitNotifications)

    await login(page)
    await page.goto(`/view/list`)
    const visitListPage = await ListVisitsPage.verifyOnPage(page)
    await visitListPage.page.getByRole('link', { name: 'Select' }).first().click()
    await ViewVisitPage.verifyOnPage(page)

    await page.getByRole('link', { name: 'Cancel visit' }).click()
    await CancelVisitPage.verifyOnPage(page)
    await page.getByRole('radio', { name: 'Cancelled by visitor' }).click()

    await officialVisitsApi.stubGetOfficialVisitById({
      ...mockVisitByIdVisit,
      visitStatus: 'CANCELLED',
      visitStatusDescription: 'Cancelled',
    })
    await page.getByRole('button', { name: 'Continue' }).click()

    const banner = page.getByRole('region', { name: 'success: Visit cancelled' })
    await expect(banner).toBeVisible()
    await expect(banner.getByText('You have cancelled this visit. You can:')).toBeVisible()
    const emailLink = banner.getByRole('link', { name: 'send updated email confirmation' })
    await expect(emailLink).toHaveAttribute('href', '/notification/enter-email-address/1/cancel')
    await expect(banner.getByRole('link', { name: 'return to search list' })).toBeVisible()

    await emailLink.click()
    const emailPage = await NotificationEmailPage.verifyOnPage(page)
    await expect(page).toHaveURL('/notification/enter-email-address/1/cancel')
    await expect(emailPage.emailInput).toHaveValue('visitor@example.com')
  })

  test('Success banner shows plain return link when email notifications are disabled for the prison', async ({
    page,
  }) => {
    await componentsApi.stubComponents('BXI', 'Brixton (HMP)')
    await officialVisitsApi.stubCancelVisit({}, 'BXI')

    await login(page)
    await page.goto('/view/visit/1')
    await expect(page.locator('h1', { hasText: 'Official visit' })).toBeVisible()
    await expect(page.locator('#send-email-button')).toHaveCount(0)

    await page.getByRole('link', { name: 'Cancel visit' }).click()
    await CancelVisitPage.verifyOnPage(page)
    await page.getByRole('radio', { name: 'Cancelled by visitor' }).click()

    await officialVisitsApi.stubGetOfficialVisitById({
      ...mockVisitByIdVisit,
      visitStatus: 'CANCELLED',
      visitStatusDescription: 'Cancelled',
    })
    await page.getByRole('button', { name: 'Continue' }).click()

    const banner = page.getByRole('region', { name: 'success: Visit cancelled' })
    await expect(banner).toBeVisible()
    await expect(banner.getByRole('link', { name: 'send updated email confirmation' })).toHaveCount(0)
    await expect(banner.getByRole('link', { name: 'Return to search list', exact: true })).toBeVisible()
  })
})
