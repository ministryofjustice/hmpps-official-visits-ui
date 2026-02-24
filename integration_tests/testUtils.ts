import { Page } from '@playwright/test'
import tokenVerification from './mockApis/tokenVerification'
import hmppsAuth, { type UserToken } from './mockApis/hmppsAuth'
import { resetStubs } from './mockApis/wiremock'
import { AuthorisedRoles } from '../server/middleware/populateUserPermissions'
import { defaultEndDate, defaultStartDate, generateMockData } from './mockData/data'
import officialVisitsApi from './mockApis/officialVisitsApi'

export { resetStubs }

const DEFAULT_ROLES = ['ROLE_SOME_REQUIRED_ROLE', 'ROLE_PRISON', `ROLE_${AuthorisedRoles.MANAGE}`]

export const attemptHmppsAuthLogin = async (page: Page) => {
  await page.goto('/')
  page.locator('h1', { hasText: 'Sign in' })
  const url = await hmppsAuth.getSignInUrl()
  await page.goto(url)
}

export const login = async (
  page: Page,
  { name, roles = DEFAULT_ROLES, active = true, authSource = 'nomis' }: UserToken & { active?: boolean } = {},
) => {
  await Promise.all([
    hmppsAuth.favicon(),
    hmppsAuth.stubSignInPage(),
    hmppsAuth.stubSignOutPage(),
    hmppsAuth.token({ name, roles, authSource }),
    tokenVerification.stubVerifyToken(active),
  ])
  await attemptHmppsAuthLogin(page)
}

export function equalToJson(body: object) {
  return [{ equalToJson: body, ignoreExtraElements: false, ignoreArrayOrder: true }]
}

export function makePageData(mockData: object[]) {
  return {
    number: 0,
    size: 10,
    totalElements: mockData.length,
    totalPages: Math.ceil(mockData.length / 10),
  }
}

export const summaryValue = (page: Page, key: string | RegExp, value?: string) =>
  page
    .locator('.govuk-summary-list__row', {
      has: page.locator('.govuk-summary-list__key', { hasText: key }),
    })
    .locator('.govuk-summary-list__value', value ? { hasText: value } : undefined)

export const setupFindByCriteriaStubs = async () => {
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
