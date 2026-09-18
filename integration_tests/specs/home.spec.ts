import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import { login } from '../testUtils'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import HomePage from '../pages/homePage'

const reviewCard = 'visits-need-review-card'
const reviewCount = 'visits-need-review-count'

test.describe('Official visits homepage', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await officialVisitsApi.stubVisitsForReviewCount('LEI', 3)
  })
  test('should show only the view card for DEFAULT role users', async ({ page }) => {
    await login(page, { name: 'AUser', roles: [`ROLE_${AuthorisedRoles.DEFAULT}`], active: true, authSource: 'nomis' })
    await page.goto(`/`)
    await HomePage.verifyOnPage(page)

    expect(page.getByRole('link', { name: 'View official visits', exact: true })).toBeVisible()
    expect(page.getByRole('link', { name: 'Manage official visits' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'Book an official visit' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'Official visiting schedule' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'View official visits emails' })).not.toBeVisible()
    await expect(page.getByTestId(reviewCard)).toBeHidden()
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

    expect(page.getByRole('link', { name: 'View official visits', exact: true })).toBeVisible()
    expect(page.getByRole('link', { name: 'Manage official visits' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'Book an official visit' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'Official visiting schedule' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'View official visits emails' })).not.toBeVisible()
    await expect(page.getByTestId(reviewCard)).toBeVisible()
    await expect(page.getByTestId(reviewCount)).toHaveText('3 visits need review')
  })

  test('should show book, manage and emails cards for MANAGE role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.MANAGE}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/`)
    await HomePage.verifyOnPage(page)

    expect(page.getByRole('link', { name: 'Book an official visit' })).toBeVisible()
    expect(page.getByRole('link', { name: 'Manage official visits' })).toBeVisible()
    expect(page.getByRole('link', { name: 'View official visits emails' })).toBeVisible()
    expect(page.getByRole('link', { name: 'View official visits', exact: true })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'Official visiting schedule' })).not.toBeVisible()
    await expect(page.getByTestId(reviewCard)).toBeVisible()
  })

  test('should show schedule card for ADMIN role', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`, `ROLE_${AuthorisedRoles.ADMIN}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/`)
    await HomePage.verifyOnPage(page)

    expect(page.getByRole('link', { name: 'Official visiting schedule' })).toBeVisible()
    expect(page.getByRole('link', { name: 'Book an official visit' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'Manage official visits' })).not.toBeVisible()
    expect(page.getByRole('link', { name: 'View official visits emails' })).not.toBeVisible()
    await expect(page.getByTestId(reviewCard)).toBeHidden()
  })
})
