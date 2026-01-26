import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import exampleApi from '../mockApis/exampleApi'

import { login, resetStubs } from '../testUtils'
import HomePage from '../pages/homePage'
import componentsApi from '../mockApis/componentsApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import { NotAuthorisedPage } from '../pages/notAuthorisedPage'

test.describe('SignIn', () => {
  test.beforeEach(async () => {
    await componentsApi.stubComponents()
    await exampleApi.stubExampleTime()
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('Unauthenticated user directed to auth', async ({ page }) => {
    await hmppsAuth.stubSignInPage()
    await page.goto('/')

    await expect(page.getByRole('heading')).toHaveText('Sign in')
  })

  test('Unauthenticated user navigating to sign in page directed to auth', async ({ page }) => {
    await hmppsAuth.stubSignInPage()
    await page.goto('/sign-in')

    await expect(page.getByRole('heading')).toHaveText('Sign in')
  })

  test('Authenticated user sees the home page', async ({ page }) => {
    await login(page)

    await HomePage.verifyOnPage(page)
  })

  test('User can sign out', async ({ page }) => {
    await login(page)

    const homePage = await HomePage.verifyOnPage(page)
    await homePage.signOut()

    await expect(page.getByRole('heading')).toHaveText('Sign in')
  })

  test('Token verification failure takes user to sign in page', async ({ page }) => {
    await login(page, { active: false })

    await expect(page.getByRole('heading')).toHaveText('Sign in')
  })

  test('Token verification failure clears user session', async ({ page }) => {
    await login(page, { name: 'A TestUser', active: false })

    await expect(page.getByRole('heading')).toHaveText('Sign in')

    await login(page, { name: 'Some OtherTestUser', active: true })

    await HomePage.verifyOnPage(page)
  })

  test('Users without any official visits roles are redirected to the not authorised page', async ({ page }) => {
    await login(page, {
      name: 'A TestUser',
      roles: ['ROLE_SOME_REQUIRED_ROLE', 'ROLE_PRISON'],
      active: true,
      authSource: 'nomis',
    })

    await NotAuthorisedPage.verifyOnPage(page)
  })
})
