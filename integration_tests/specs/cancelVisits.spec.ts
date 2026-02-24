import { expect, test } from '@playwright/test'
import { format } from 'date-fns'
import hmppsAuth from '../mockApis/hmppsAuth'
import manageUsersApi from '../mockApis/manageUsersApi'
import { equalToJson, login, makePageData, resetStubs } from '../testUtils'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import componentsApi from '../mockApis/componentsApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import personalRelationshipsApi from '../mockApis/personalRelationshipsApi'
import prisonApi from '../mockApis/prisonApi'
import ListVisitsPage from '../pages/listVisitsPage'
import { mockPrisonerRestrictions, mockVisitByIdVisit } from '../../server/testutils/mocks'
import ViewVisitPage from '../pages/viewVisitPage'
import CancelVisitPage from '../pages/cancelVisitPage'
import {
  completionCodes,
  defaultEndDate,
  defaultStartDate,
  generateMockData,
  locations,
  mockPrisoner,
  searchLevels,
  statuses,
  visitTypes,
} from '../mockData/data'

const setupFindByCriteriaStubs = async () => {
  const mockVisitData = generateMockData()

  await officialVisitsApi.stubFindByCriteria(
    { content: mockVisitData, page: makePageData(mockVisitData) },
    equalToJson({ startDate: defaultStartDate, endDate: defaultEndDate }),
  )
  await officialVisitsApi.stubFindByCriteria(
    { content: mockVisitData, page: makePageData(mockVisitData) },
    equalToJson({ startDate: defaultStartDate, endDate: defaultEndDate }),
    1,
  )

  const mockVistDataTermFilter = mockVisitData.filter(
    o => o.prisoner.firstName === 'John' && o.visitDate === '2026-01-01',
  )
  await officialVisitsApi.stubFindByCriteria(
    { content: mockVistDataTermFilter, page: makePageData(mockVistDataTermFilter) },
    equalToJson({
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      searchTerm: 'John',
    }),
  )

  const mockVisitDataStatusTermFilter = mockVistDataTermFilter.filter(o => o.visitStatus === 'COMPLETED')
  await officialVisitsApi.stubFindByCriteria(
    { content: mockVisitDataStatusTermFilter, page: makePageData(mockVisitDataStatusTermFilter) },
    equalToJson({
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      searchTerm: 'John',
      visitStatuses: ['COMPLETED'],
    }),
  )

  const mockVisitDataTypeStatusTermFilter = mockVisitDataStatusTermFilter.filter(o => o.visitTypeCode === 'VIDEO')
  await officialVisitsApi.stubFindByCriteria(
    { content: mockVisitDataTypeStatusTermFilter, page: makePageData(mockVisitDataTypeStatusTermFilter) },
    equalToJson({
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      searchTerm: 'John',
      visitStatuses: ['COMPLETED'],
      visitTypes: ['VIDEO'],
    }),
  )

  const mockVisitDataAllFilters = mockVisitDataTypeStatusTermFilter.filter(
    o => o.dpsLocationId === '9485cf4a-750b-4d74-b594-59bacbcda247',
  )
  await officialVisitsApi.stubFindByCriteria(
    { content: mockVisitDataAllFilters, page: makePageData(mockVisitDataAllFilters) },
    equalToJson({
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      searchTerm: 'John',
      visitStatuses: ['COMPLETED'],
      visitTypes: ['VIDEO'],
      locationIds: ['9485cf4a-750b-4d74-b594-59bacbcda247'],
    }),
  )
}

test.describe('Cancel a official visit', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await manageUsersApi.stubGetByUsername()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await prisonerSearchApi.stubGetByPrisonerNumber(mockPrisoner)
    await personalRelationshipsApi.stubRestrictions({ content: mockPrisonerRestrictions })
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
    await officialVisitsApi.stubGetOfficialVisitById(mockVisitByIdVisit)
    await officialVisitsApi.stubCompleteVisit({})
    await officialVisitsApi.stubCancelVisit({})
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
    await expect(page.getByRole('region', { name: 'success: Visit marked as' })).toBeVisible()
    await expect(page.getByText('You have cancelled this visit.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Return to search list' })).toBeVisible()
  })
})
