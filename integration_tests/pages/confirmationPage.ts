import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ConfirmationPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: `New official visit booked` })
    this.caption = page.locator('.govuk-panel__body')
  }

  static async verifyOnPage(superPage: Page): Promise<ConfirmationPage> {
    const page = new ConfirmationPage(superPage)
    await expect(page.header).toBeVisible()
    return page
  }
}
