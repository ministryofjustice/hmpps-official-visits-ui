import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CancelVisitPage extends AbstractPage {
  readonly header: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Cancel an official visit' })
  }

  static async verifyOnPage(page: Page): Promise<CancelVisitPage> {
    const cancelPage = new CancelVisitPage(page)
    await expect(cancelPage.header).toBeVisible()
    return cancelPage
  }
}
