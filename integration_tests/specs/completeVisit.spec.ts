import { expect, test } from '@playwright/test'
import { format } from 'date-fns'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login, resetStubs, setupFindByCriteriaStubs, summaryValue } from '../testUtils'
import prisonerSearchApi from '../mockApis/prisonerSearchApi'
import componentsApi from '../mockApis/componentsApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import personalRelationshipsApi from '../mockApis/personalRelationshipsApi'
import prisonApi from '../mockApis/prisonApi'
import ListVisitsPage from '../pages/listVisitsPage'
import { mockPrisonerRestrictions, mockVisitByIdVisit } from '../../server/testutils/mocks'
import ViewVisitPage from '../pages/viewVisitPage'
import CompleteVisitPage from '../pages/completeVisitPage'
import manageUsersApi from '../mockApis/manageUsersApi'
import {
  completionCodes,
  defaultEndDate,
  defaultStartDate,
  locations,
  mockPrisoner,
  searchLevels,
  statuses,
  visitTypes,
} from '../mockData/data'

test.describe('Complete official visits', () => {
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
    await expect(summaryValue(page, 'Prisoner notes')).toHaveText('prisoner notes')
    await expect(summaryValue(page, 'Staff notes')).toHaveText('staff notes')
    await expect(summaryValue(page, 'Created by')).toHaveText('Test User (Monday, 19 January 2026)')
    await expect(summaryValue(page, 'Last modified')).toHaveText('Test User (Monday, 19 January 2026)')
    await expect(summaryValue(page, 'Visitor concerns', 'visit level visitor concern notes')).toBeTruthy()

    await expect(summaryValue(page, 'Contact type')).toHaveText('Official')

    await expect(summaryValue(page, 'Does this visitor need assistance?')).toHaveText('Yes')
    await expect(summaryValue(page, 'Assistance details')).toHaveText('Assistance details')
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
