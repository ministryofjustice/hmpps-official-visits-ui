import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login } from '../testUtils'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import HomePage from '../pages/homePage'

test.describe('Official visits homepage', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
  })
  test('should show only view card for DEFAULT role users', async ({ page }) => {
    await login(page, { name: 'AUser', roles: [`ROLE_${AuthorisedRoles.DEFAULT}`], active: true, authSource: 'nomis' })
    await page.goto(`/`)
    await HomePage.verifyOnPage(page)

    expect(page.getByRole('link', { name: 'View or cancel existing' })).toBeVisible()
    expect(page.getByRole('link', { name: 'Book an official visit' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'Administer days, slots and' })).not.toBeVisible()
  })

  test('should show view visits card for VIEW role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.VIEW}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/`)
    await HomePage.verifyOnPage(page)

    expect(page.getByRole('link', { name: 'View or cancel existing' })).toBeVisible()
    expect(page.getByRole('link', { name: 'Book an official visit' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'Administer days, slots and' })).not.toBeVisible()
  })

  test('should show view and book visit cards for MANAGE role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.MANAGE}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/`)
    await HomePage.verifyOnPage(page)

    expect(page.getByRole('link', { name: 'View or cancel existing' })).toBeVisible()
    expect(page.getByRole('link', { name: 'Book an official visit' })).toBeVisible()
    expect(page.getByRole('link', { name: 'Administer days, slots and' })).not.toBeVisible()
  })

  test('should show view and admin cards for ADMIN role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.ADMIN}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/`)
    await HomePage.verifyOnPage(page)

    expect(page.getByRole('link', { name: 'View or cancel existing' })).toBeVisible()
    expect(page.getByRole('link', { name: 'Book an official visit' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'Administer days, slots and' })).toBeVisible()
  })
})
