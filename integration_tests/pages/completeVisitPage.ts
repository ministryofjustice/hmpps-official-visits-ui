import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CompleteVisitPage extends AbstractPage {
  readonly header: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Provide the visit outcome and attendance details' })
  }

  static async verifyOnPage(page: Page): Promise<CompleteVisitPage> {
    const completePage = new CompleteVisitPage(page)
    await expect(completePage.header).toBeVisible()
    return completePage
  }
}
