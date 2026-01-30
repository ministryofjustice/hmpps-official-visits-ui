import { expect, test } from '@playwright/test'
import { format } from 'date-fns'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs, summaryValue } from '../testUtils'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import componentsApi from '../mockApis/componentsApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { FindByCriteriaVisit } from '../../server/@types/officialVisitsApi/types'
import personalRelationshipsApi from '../mockApis/personalRelationshipsApi'
import prisonApi from '../mockApis/prisonApi'
import ListVisitsPage from '../pages/listVisitsPage'
import { mockPrisonerRestrictions, mockVisitByIdVisit } from '../../server/testutils/mocks'
import ViewVisitPage from '../pages/viewVisitPage'
import CancelVisitPage from '../pages/cancelVisitPage'
import CompleteVisitPage from '../pages/completeVisitPage'

const mockPrisoner = {
  prisonerNumber: 'A1111AA',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1989-06-01',
  cellLocation: 'LEI-1-1',
  pncNumber: '429',
  croNumber: '123456/12A',
  prisonId: 'LEI',
  prisonName: 'Example Prison (EXP)',
}

const defaultStartDate = new Date().toISOString().substring(0, 10)
const defaultEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)

const setupFindByCriteriaStubs = async () => {
  const mockVisitData = generateMockData()
  const makePageData = (mockData: object[]) => ({
    number: 0,
    size: 10,
    totalElements: mockData.length,
    totalPages: Math.ceil(mockData.length / 10),
  })
  const equalToJson = (body: object) => [{ equalToJson: body, ignoreExtraElements: false, ignoreArrayOrder: true }]

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

test.describe('View official visits', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
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
    await officialVisitsApi.stubRefData('VIS_TYPE', types)
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
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('Happy path', async ({ page }) => {
    const startDate = new Date().toISOString().substring(0, 10)
    const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)

    await login(page)
    await page.goto(`/view/list`)
    const visitListPage = await ListVisitsPage.verifyOnPage(page)

    expect(await page.getByText('total results').first().innerText()).toBe('Showing 1 to 10 of 32 total results')

    await visitListPage.getNextPageLink().click()
    expect(page.url()).toBe(
      `http://localhost:3007/view/list?page=2&startDate=${defaultStartDate}&endDate=${defaultEndDate}`,
    )

    await visitListPage.getSearchBox().fill('John')
    await visitListPage.getFromDateInput().fill('01/01/2026')
    await visitListPage.getToDateInput().fill('02/01/2026')

    await visitListPage.getSearchButton().click()

    expect(await page.getByText('total results').first().innerText()).toBe('8 total results')

    await visitListPage.getShowFilterButton().click()
    await visitListPage.getLocationFilter().selectOption(locations[0].code)
    await visitListPage.getTypeFilter().selectOption(types[0].code)
    await visitListPage.getStatusFilter().selectOption(statuses[0].code)
    await visitListPage.getApplyFiltersButton().click()

    expect(await page.getByText('total results').first().innerText()).toBe('1 total results')

    await visitListPage.getRemoveFilter('First').click()
    expect(page.url()).toBe(
      'http://localhost:3007/view/list?page=1&prisoner=John&startDate=2026-01-01&endDate=2026-01-02&status=COMPLETED&type=VIDEO',
    )
    expect(await page.getByText('total results').first().innerText()).toBe('2 total results')

    await visitListPage.getRemoveFilter('Video').click()
    expect(page.url()).toBe(
      'http://localhost:3007/view/list?page=1&prisoner=John&startDate=2026-01-01&endDate=2026-01-02&status=COMPLETED',
    )
    expect(await page.getByText('total results').first().innerText()).toBe('4 total results')

    await visitListPage.getRemoveFilter('Completed').click()
    expect(page.url()).toBe(
      'http://localhost:3007/view/list?page=1&prisoner=John&startDate=2026-01-01&endDate=2026-01-02',
    )
    expect(await page.getByText('total results').first().innerText()).toBe('8 total results')

    await visitListPage.page.getByRole('link', { name: 'Select' }).first().click()
    const b64 = encodeURIComponent(btoa(`/view/list?page=1&prisoner=John&startDate=2026-01-01&endDate=2026-01-02`))
    expect(page.url()).toBe(`http://localhost:3007/view/visit/1?backTo=${b64}`)

    ViewVisitPage.verifyOnPage(page)

    await expect(page.locator('[data-qa="mini-profile-person-profile-link"]')).toHaveText('Doe, John')

    await expect(page.locator('[data-qa="mini-profile-prisoner-number"]')).toHaveText(mockPrisoner.prisonerNumber)

    await expect(page.locator('[data-qa="mini-profile-dob"]')).toHaveText('1 June 1989')

    await expect(page.locator('[data-qa="mini-profile-cell-location"]')).toHaveText(mockPrisoner.cellLocation)

    await expect(page.locator('[data-qa="mini-profile-prison-name"]')).toHaveText(mockPrisoner.prisonName)

    await expect(page.locator('[data-qa="contact-A1111AA-alerts-restrictions"]')).toHaveText(
      /3\s*restrictions\s*and\s*0\s*alerts/,
    )

    await expect(summaryValue(page, 'Date')).toHaveText('Thursday, 1 January 2026')

    await expect(summaryValue(page, 'Time')).toHaveText('10:00am to 11:00am (1 hour)')

    await expect(summaryValue(page, 'Visit status')).toHaveText('Scheduled')

    await expect(summaryValue(page, 'Visit reference number')).toHaveText('1')

    await expect(summaryValue(page, 'Location')).toHaveText('First Location')

    await expect(summaryValue(page, 'Visit type')).toHaveText('Video')

    await expect(summaryValue(page, 'Notes')).toHaveText('Extra information')

    await expect(summaryValue(page, 'Created by')).toHaveText('USERNAME_GEN (Monday, 19 January 2026)')

    await expect(summaryValue(page, 'Last modified')).toHaveText('USERNAME_GEN (Monday, 19 January 2026)')

    await expect(summaryValue(page, 'Contact type')).toHaveText('Official')

    await expect(summaryValue(page, 'Does this visitor need assistance')).toHaveText('Yes')

    await expect(summaryValue(page, 'Assistance details')).toHaveText('Assistance details')

    await expect(summaryValue(page, 'Equipment')).toHaveText('Laptop')

    await expect(summaryValue(page, 'Visitor concerns')).toHaveText('Assistance details')

    await expect(summaryValue(page, 'Email')).toHaveText('test@test.com')

    await expect(summaryValue(page, 'Telephone number')).toHaveText('0123456789')

    const cardLink = page.locator('.govuk-summary-card__title > a')
    await expect(cardLink).toHaveText('Peter Malicious')

    await expect(cardLink).toHaveAttribute(
      'href',
      'http://localhost:9091/prisoner/G4793VF/contacts/manage/20085647/relationship/7332364',
    )

    await page.getByRole('link', { name: 'Cancel visit' }).click()

    await CancelVisitPage.verifyOnPage(page)

    expect(page.url()).toContain('http://localhost:3007/view/visit/1/cancel')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.getByRole('link', { name: 'Select a cancellation reason' }).click()
    await page.getByRole('radio', { name: 'Cancelled by visitor' }).click()

    await page.getByRole('button', { name: 'Continue' }).click()

    expect(page.url()).toContain('http://localhost:3007/view/visit/1?backTo=')
    expect(page.getByRole('region', { name: 'success: Visit marked as' })).toBeVisible()

    await page.getByRole('link', { name: 'Return to search list' }).click()

    expect(page.url()).toBe(
      'http://localhost:3007/view/list?page=1&prisoner=John&startDate=2026-01-01&endDate=2026-01-02',
    )

    await page.goBack()

    await page.getByRole('link', { name: 'Complete visit' }).click()
    await CompleteVisitPage.verifyOnPage(page)

    // Label text
    await expect(page.locator('label[for="reason"]')).toHaveText('Select a completion reason from the list')

    // Reason <select> option values
    const optionValues = await page
      .locator('select[name="reason"] option')
      .evaluateAll(options => options.map(o => (o as HTMLOptionElement).value))

    expect(optionValues).toContain('')
    expect(optionValues).toContain('NORMAL')
    expect(optionValues).not.toContain('SOMETHING_CANCELLED')

    await expect(page.locator('#prisoner')).toHaveAttribute('value', 'G4793VF')
    await expect(page.locator('.govuk-checkboxes__label[for="prisoner"]')).toHaveText('Tim Harrison (Prisoner)')
    await expect(page.locator('#prisoner')).toBeChecked()

    const searchTypeOptionValues = await page
      .locator('select[name="searchType"] option')
      .evaluateAll(options => options.map(o => (o as HTMLOptionElement).value).filter(Boolean))
    expect(searchTypeOptionValues).toContain('FULL')
    expect(searchTypeOptionValues).toContain('RUB_DOWN')

    await expect(page.locator('.govuk-checkboxes__label[for="attendance\\[0\\]"]')).toHaveText(
      'Peter Malicious (Solicitor)',
    )
    await expect(page.locator('#attendance\\[0\\]')).toBeChecked()

    const cancelLink = page.locator('a.govuk-link.govuk-link--no-visited-state')
    await expect(cancelLink).toHaveText('Cancel and return to visit summary')
    await expect(cancelLink).toHaveAttribute(
      'href',
      `/view/visit/1?backTo=L3ZpZXcvbGlzdD9wYWdlPTEmcHJpc29uZXI9Sm9obiZzdGFydERhdGU9MjAyNi0wMS0wMSZlbmREYXRlPTIwMjYtMDEtMDI=`,
    )

    await page.locator('select[name="reason"]').selectOption('NORMAL')
    await page.getByRole('button', { name: 'Continue' }).click()

    expect(page.url()).toContain('http://localhost:3007/view/visit/1?backTo=')
    expect(page.getByRole('region', { name: 'success: Visit marked as' })).toBeVisible()

    await page.getByRole('link', { name: 'Return to search list' }).click()

    expect(page.url()).toBe(
      'http://localhost:3007/view/list?page=1&prisoner=John&startDate=2026-01-01&endDate=2026-01-02',
    )
  })
})

const locations = [
  {
    code: '9485cf4a-750b-4d74-b594-59bacbcda247',
    description: 'First Location',
  },
  {
    code: '0199bed0-4927-7361-998a-4deddbfbbbf3',
    description: 'Second Location',
  },
]

const statuses = [
  { code: 'COMPLETED', description: 'Completed' },
  { code: 'SCHEDULED', description: 'Scheduled' },
]

const types = [
  { code: 'VIDEO', description: 'Video' },
  { code: 'NOTVIDEO', description: 'Not video' },
]

const completionCodes = [
  { code: 'NORMAL', description: 'Normal' },
  { code: 'VISITOR_CANCELLED', description: 'Cancelled by visitor' },
]

const searchLevels = [
  { code: 'FULL', description: 'Full' },
  { code: 'RUB_DOWN', description: 'Rub down' },
]

// Create mock data with one visit at each location, status, type and date for two people (32 visits)
const generateMockData = (): FindByCriteriaVisit[] => {
  const mockVisit = {
    officialVisitId: 294,
    prisonCode: 'MDI',
    prisonDescription: 'Moorland (HMP & YOI)',
    visitDate: '2022-12-23',
    startTime: '10:00',
    endTime: '11:00',
    visitSlotId: 1,
    staffNotes: 'Legal representation details',
    prisonerNotes: 'Please arrive 10 minutes early',
    visitorConcernNotes: 'string',
    numberOfVisitors: 3,
    completionCode: 'VISITOR_CANCELLED',
    completionDescription: 'string',
    createdBy: 'Fred Bloggs',
    createdTime: '2025-12-02 14:45',
    updatedBy: 'Jane Bloggs',
    updatedTime: '22025-12-04 09:50',
    prisoner: mockPrisoner,
  }

  const combos = [
    new Date(2026, 0, 1).toISOString().substring(0, 10),
    new Date().toISOString().substring(0, 10),
  ].flatMap(date =>
    locations.flatMap(loc =>
      statuses.flatMap(status =>
        types.flatMap(type => ['John', 'Jane'].map(name => ({ date, loc, status, type, name }))),
      ),
    ),
  )

  return Array.from({ length: combos.length }, (_, i) => {
    const { loc, status, type, name, date } = combos[i % combos.length]

    return {
      ...mockVisit,
      officialVisitId: i + 1,
      visitDate: date,
      dpsLocationId: loc.code,
      locationDescription: loc.description,
      visitStatus: status.code,
      visitStatusDescription: status.description,
      visitTypeCode: type.code,
      visitTypeDescription: type.description,
      prisoner: {
        ...mockVisit.prisoner,
        firstName: name,
        prisonCode: 'LEI',
        prisonerNumber: 'A1111AA',
      },
    } as FindByCriteriaVisit
  })
}
