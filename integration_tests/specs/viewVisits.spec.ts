import { expect, test } from '@playwright/test'
import { format } from 'date-fns'
import hmppsAuth from '../mockApis/hmppsAuth'
import { equalToJson, login, makePageData, resetStubs, summaryValue } from '../testUtils'
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
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import manageUsersApi from '../mockApis/manageUsersApi'
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
import { AuditedEvent } from '../../server/@types/officialVisitsApi/types'

const auditedEvents: AuditedEvent[] = [
  {
    auditedEventId: 1,
    officialVisitId: 1,
    eventSummary: 'Visit updated',
    eventType: 'UPDATE',
    eventChanges: [
      {
        field: 'visitor_removed',
        newValue: 'Jack Malicious',
      },
      {
        field: 'visitor_updated',
        oldValue: 'Peter Malicious',
        newValue: 'John Smith',
      },
      {
        field: 'visitor_removed',
        newValue: 'Jack Smith',
      },
    ],
    eventDateTime: '2026-10-25T14:30:00.000000',
    eventUsername: 'AUSER',
    eventUserFullName: 'A User',
    significantChange: true,
  },
]

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

test.describe('View official visits', () => {
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
    await officialVisitsApi.stubGetVisitChangeStatus({ hasChanged: false })
    await officialVisitsApi.stubGetOfficialVisitById(mockVisitByIdVisit)
    await officialVisitsApi.stubGetOfficialVisitAuditedEvents(auditedEvents)
    await officialVisitsApi.getNotificationsByOfficialVisitId(1, [
      {
        notificationId: 2,
        officialVisitId: 1,
        templateId: 'template-2',
        emailAddress: 'visitor@example.com',
        reason: 'Confirmation email sent',
        govNotifyNotificationId: '11111111-1111-1111-1111-111111111111',
        emailStatus: 'SENT',
        createdTime: '2026-10-25T15:30:00.000000',
        statusUpdatedTime: '2026-10-25T15:30:00.000000',
      },
      {
        notificationId: 3,
        officialVisitId: 1,
        templateId: 'template-3',
        emailAddress: 'visitor@example.com',
        reason: 'Temporary delivery failure',
        govNotifyNotificationId: '22222222-2222-2222-2222-222222222222',
        emailStatus: 'TEMPORARY_FAILURE',
        createdTime: '2026-10-25T13:30:00.000000',
        statusUpdatedTime: '2026-10-25T13:30:00.000000',
      },
    ])
    await officialVisitsApi.stubCompleteVisit({})
    await officialVisitsApi.stubCancelVisit({})
    await officialVisitsApi.stubAllContacts([...mockOfficialVisitors, ...mockSocialVisitors, mockVisitByIdVisitContact])
    await personalRelationshipsApi.stubRelationship(7332364)
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('should allow access as far as search page for DEFAULT role', async ({ page }) => {
    await login(page, { name: 'AUser', roles: [`ROLE_${AuthorisedRoles.DEFAULT}`], active: true, authSource: 'nomis' })
    await page.goto(`/view/list`)
    const visitListPage = await ListVisitsPage.verifyOnPage(page)

    // Basic interaction test
    await visitListPage.getSearchBox().fill('John')
    await visitListPage.getFromDateInput().fill('01/01/2026')
    await visitListPage.getToDateInput().fill('02/01/2026')
    await visitListPage.getSearchButton().click()

    // TODO: Flesh this test out when we have designs on what limited view entails
    expect(visitListPage.page.getByRole('link', { name: 'Select' })).toHaveCount(0)
  })

  test('should allow access as far as visit summary for VIEW role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.VIEW}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/view/list`)
    const visitListPage = await ListVisitsPage.verifyOnPage(page)

    // Basic interaction test
    await visitListPage.getSearchBox().fill('John')
    await visitListPage.getFromDateInput().fill('01/01/2026')
    await visitListPage.getToDateInput().fill('02/01/2026')
    await visitListPage.getSearchButton().click()

    await visitListPage.page.getByRole('link', { name: 'Select' }).first().click()
    // Should be no links to Amend, Cancel or Complete
    await expect(page.locator('.govuk-summary-card__actions')).toHaveCount(0)
    await expect(page.locator('a[href*="/amend"]')).toHaveCount(0)
  })

  test('should allow access as far as search / filter page for ADMIN role', async ({ page }) => {
    await login(page, { name: 'AUser', roles: [`ROLE_${AuthorisedRoles.DEFAULT}`], active: true, authSource: 'nomis' })
    await page.goto(`/view/list`)
    const visitListPage = await ListVisitsPage.verifyOnPage(page)

    // Basic interaction test
    await visitListPage.getSearchBox().fill('John')
    await visitListPage.getFromDateInput().fill('01/01/2026')
    await visitListPage.getToDateInput().fill('02/01/2026')
    await visitListPage.getSearchButton().click()

    // TODO: Flesh this test out when we have designs on what limited view entails
    expect(visitListPage.page.getByRole('link', { name: 'Select' })).toHaveCount(0)
  })

  test('Happy path', async ({ page }) => {
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
    await visitListPage.getTypeFilter().selectOption(visitTypes[0].code)
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

    await expect(summaryValue(page, 'Date')).toHaveText('Friday, 25 December 2099')
    await expect(summaryValue(page, 'Time')).toHaveText('10:00 to 11:00 (1 hour)')
    await expect(summaryValue(page, 'Visit status')).toHaveText('Scheduled')
    await expect(summaryValue(page, 'Visit reference number')).toHaveText('1')
    await expect(summaryValue(page, 'Location')).toHaveText('First Location')
    await expect(summaryValue(page, 'Visit type')).toHaveText('Video')
    await expect(summaryValue(page, 'Prisoner notes')).toHaveText('prisoner notes')
    await expect(summaryValue(page, 'Staff notes')).toHaveText('staff notes')
    await expect(summaryValue(page, 'Created by')).toHaveText('Test User (Monday, 19 January 2026)')
    await expect(summaryValue(page, 'Last modified')).toHaveText('Test User (Monday, 19 January 2026)')
    await expect(summaryValue(page, 'Visitor concerns', 'visit level visitor concern notes')).toBeTruthy()

    await expect(summaryValue(page, 'Contact type')).toHaveText('Official')

    await expect(summaryValue(page, 'Does this visitor need assistance?')).toHaveText('Yes')
    await expect(summaryValue(page, 'Further details')).toHaveText('Further details')
    await expect(summaryValue(page, 'Does this visitor need equipment?')).toHaveText('Yes')
    await expect(summaryValue(page, /Equipment/)).toHaveText('Laptop')
    await expect(summaryValue(page, 'Email')).toHaveText('test@test.com')
    await expect(summaryValue(page, 'Telephone number')).toHaveText('0123456789')

    const cardLink = page.locator('.govuk-summary-card__title > a')
    await expect(cardLink).toHaveText('Peter Malicious')

    await expect(cardLink).toHaveAttribute(
      'href',
      'http://localhost:9091/prisoner/G4793VF/contacts/manage/20085647/relationship/7332364',
    )

    await page.getByRole('button', { name: 'View all changes made for' }).click()

    expect(page.url()).toBe('http://localhost:3007/view/visit/1/history')
    await expect(page.locator('.govuk-hint')).toHaveText('Manage existing official visits')
    await expect(page.locator('h1.govuk-heading-l')).toHaveText('Official visit')
    await expect(page.locator('.moj-timeline__title').first()).toHaveText('Email notification sent')
    await expect(page.locator('.moj-timeline__title').nth(1)).toHaveText('Visit updated')
    await expect(page.locator('.moj-timeline__title').nth(2)).toHaveText('Email notification temporarily failed')
    await expect(page.locator('.moj-timeline__byline').first()).toContainText('visitor@example.com')
    await expect(page.locator('.moj-timeline__byline').nth(1)).toContainText('A User')
    await expect(page.locator('.moj-timeline__date').first()).toHaveText('25 October 2026 at 15:30')
    await expect(page.locator('.moj-timeline__date').nth(1)).toHaveText('25 October 2026 at 14:30')
    await expect(page.locator('.moj-timeline__date').nth(2)).toHaveText('25 October 2026 at 13:30')
    await expect(
      page.getByText('Email address: visitor@example.com Reason: Confirmation email sent Status: SENT'),
    ).toBeVisible()
    await expect(
      page.getByText('Email address: visitor@example.com Reason: Temporary delivery failure Status:'),
    ).toBeVisible()
    await expect(page.getByText('Visit updated by A User')).toBeVisible()
    await expect(page.getByText('Visitor removed set to Jack Malicious')).toBeVisible()
    await expect(page.getByText('Visitor updated changed from Peter Malicious to John Smith')).toBeVisible()
    await expect(page.getByText('Visitor removed set to Jack Smith')).toBeVisible()
  })
})
