import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CancelVisitPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  private constructor(page: Page) {
    super(page)
    this.caption = page.locator('span', { hasText: 'Cancel an official visit' })
    this.header = page.locator('h1', { hasText: 'Select cancellation reason for this visit' })
  }

  static async verifyOnPage(page: Page): Promise<CancelVisitPage> {
    const cancelPage = new CancelVisitPage(page)
    await expect(cancelPage.header).toBeVisible()
    await expect(cancelPage.caption).toBeVisible()
    await cancelPage.verifyNoAccessViolationsOnPage()
    return cancelPage
  }
}
