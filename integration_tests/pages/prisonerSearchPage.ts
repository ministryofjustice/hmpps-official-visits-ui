import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class PrisonerSearchPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  readonly searchBox: Locator

  readonly searchButton: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Who is the official visit for?' })
    this.caption = page.locator('.govuk-hint', { hasText: 'Schedule an official visit' })
    this.searchBox = page.locator('#searchTerm')
    this.searchButton = page.locator('button', { hasText: 'Search' })
  }

  static async verifyOnPage(superPage: Page): Promise<PrisonerSearchPage> {
    const page = new PrisonerSearchPage(superPage)
    await expect(page.header).toBeVisible()
    await expect(page.caption).toBeVisible()
    await expect(page.searchBox).toBeVisible()
    await expect(page.searchButton).toBeVisible()
    await expect(page.cancelLink).toBeVisible()
    return page
  }
}
