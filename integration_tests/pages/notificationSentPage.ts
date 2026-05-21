import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class NotificationSentPage extends AbstractPage {
  readonly panel: Locator

  readonly viewVisitLink: Locator

  private constructor(page: Page) {
    super(page)
    this.panel = page.locator('.govuk-panel--confirmation')
    this.viewVisitLink = page.getByRole('link', { name: 'View visit' })
  }

  static async verifyOnPage(page: Page): Promise<NotificationSentPage> {
    const sentPage = new NotificationSentPage(page)
    await expect(sentPage.panel).toBeVisible()
    await sentPage.verifyNoAccessViolationsOnPage()
    return sentPage
  }
}
