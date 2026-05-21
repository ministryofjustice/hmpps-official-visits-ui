import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class NotificationEmailPage extends AbstractPage {
  readonly header: Locator

  readonly emailInput: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Enter an email address' })
    this.emailInput = page.locator('#emailAddress')
  }

  static async verifyOnPage(page: Page): Promise<NotificationEmailPage> {
    const emailPage = new NotificationEmailPage(page)
    await expect(emailPage.header).toBeVisible()
    await emailPage.verifyNoAccessViolationsOnPage()
    return emailPage
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }
}
