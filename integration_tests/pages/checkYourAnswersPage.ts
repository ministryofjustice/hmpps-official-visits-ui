import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CheckYourAnswersPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  readonly continueButton: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: `Check and confirm the official visit details` })
    this.caption = page.locator('.govuk-hint', { hasText: 'Schedule an official visit' })
    this.continueButton = page.getByRole('button', { name: 'Create official visit' })
  }

  static async verifyOnPage(superPage: Page): Promise<CheckYourAnswersPage> {
    const page = new CheckYourAnswersPage(superPage)
    await expect(page.header).toBeVisible()
    await expect(page.caption).toBeVisible()
    await page.verifyNoAccessViolationsOnPage()
    return page
  }
}
