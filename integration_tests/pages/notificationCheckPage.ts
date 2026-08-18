import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class NotificationCheckPage extends AbstractPage {
  readonly header: Locator

  readonly sendButton: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1')
    this.sendButton = page.getByRole('button', { name: /Send official visit/ })
  }

  changeLinkFor(fieldName: string): Locator {
    return this.page
      .locator('.govuk-summary-list__row')
      .filter({ has: this.page.locator('.govuk-summary-list__key', { hasText: fieldName }) })
      .getByRole('link', { name: /change/i })
  }

  static async verifyOnPage(page: Page): Promise<NotificationCheckPage> {
    const checkPage = new NotificationCheckPage(page)
    await expect(checkPage.header).toBeVisible()
    await checkPage.verifyNoAccessViolationsOnPage()
    return checkPage
  }
}
