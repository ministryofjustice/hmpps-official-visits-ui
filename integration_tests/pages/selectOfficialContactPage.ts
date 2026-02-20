import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class SelectOfficialContactPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: `Select official visitors from the prisoner's approved contact list` })
    this.caption = page.locator('.govuk-hint', { hasText: 'Schedule an official visit' })
  }

  static async verifyOnPage(superPage: Page): Promise<SelectOfficialContactPage> {
    const page = new SelectOfficialContactPage(superPage)
    await expect(page.header).toBeVisible()
    await expect(page.caption).toBeVisible()
    await expect(page.continueButton).toBeVisible()
    await expect(page.cancelLink).toBeVisible()
    return page
  }

  async checkContact(rowIndex: number) {
    await this.page.locator(`input[name^="selected"]`).nth(rowIndex).check()
  }
}
