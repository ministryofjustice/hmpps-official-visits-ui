import { Page } from '@playwright/test'
import { SuperAgentRequest } from 'superagent'
import tokenVerification from './mockApis/tokenVerification'
import hmppsAuth, { type UserToken } from './mockApis/hmppsAuth'
import { resetStubs, stubFor } from './mockApis/wiremock'
import { AuthorisedRoles } from '../server/middleware/populateUserPermissions'

export { resetStubs }

const DEFAULT_ROLES = ['ROLE_SOME_REQUIRED_ROLE', 'ROLE_PRISON', `ROLE_${AuthorisedRoles.MANAGE}`]

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P]
}

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

export function apiMock<T>(method: string, urlPattern: string, response: RecursivePartial<T>): SuperAgentRequest {
  return stubFor({
    request: {
      method,
      urlPattern,
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: response,
    },
  })
}

export function simpleApiMock<T>(urlPattern: string, response: RecursivePartial<T>): SuperAgentRequest {
  return apiMock('GET', urlPattern, response)
}
export function simplePostApiMock<T>(urlPattern: string, response: RecursivePartial<T>): SuperAgentRequest {
  return apiMock('POST', urlPattern, response)
}

export const summaryValue = (page: Page, key: string) =>
  page
    .locator('.govuk-summary-list__row', {
      has: page.locator('.govuk-summary-list__key', { hasText: key }),
    })
    .locator('.govuk-summary-list__value')
