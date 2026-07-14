import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CompleteVisitPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Select completion reason and mark attendance' })
    this.caption = page.locator('span', { hasText: 'Complete an official visit' })
  }

  static async verifyOnPage(page: Page): Promise<CompleteVisitPage> {
    const completePage = new CompleteVisitPage(page)
    await expect(completePage.header).toBeVisible()
    await expect(completePage.caption).toBeVisible()
    await completePage.verifyNoAccessViolationsOnPage()
    return completePage
  }
}
