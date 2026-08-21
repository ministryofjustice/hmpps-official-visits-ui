import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class NotificationEmailPage extends AbstractPage {
  readonly header: Locator

  readonly addAnotherButton: Locator

  readonly items: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Enter an email address' })
    this.addAnotherButton = page.getByRole('button', { name: 'Add another email address' })
    this.items = page.locator('.moj-add-another__item')
  }

  static async verifyOnPage(page: Page): Promise<NotificationEmailPage> {
    const emailPage = new NotificationEmailPage(page)
    await expect(emailPage.header).toBeVisible()
    await emailPage.verifyNoAccessViolationsOnPage()
    return emailPage
  }

  emailInput(index: number = 0): Locator {
    return this.page.locator(`[id="emailAddresses[${index}]"]`)
  }

  removeButton(index: number = 0): Locator {
    return this.items.nth(index).getByRole('button', { name: /^Remove/ })
  }

  async fillEmail(email: string, index: number = 0) {
    await this.emailInput(index).fill(email)
  }

  async addAnother() {
    await this.addAnotherButton.click()
  }
}
