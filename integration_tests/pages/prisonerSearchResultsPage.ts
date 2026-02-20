import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class PrisonerSearchResultsPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Search results' })
    this.caption = page.locator('.govuk-hint', { hasText: 'Schedule an official visit' })
  }

  static async verifyOnPage(superPage: Page): Promise<PrisonerSearchResultsPage> {
    const page = new PrisonerSearchResultsPage(superPage)
    await expect(page.header).toBeVisible()
    await expect(page.caption).toBeVisible()
    await page.verifyNoAccessViolationsOnPage()
    return page
  }

  async selectThisPrisoner() {
    await this.page.getByRole('link', { name: 'Select this prisoner' }).click()
  }
}
