import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CheckYourAnswersPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  readonly json: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: `Check your answers` })
    this.caption = page.locator('.govuk-hint', { hasText: 'Schedule an official visit' })
    this.json = page.locator('#json')
  }

  static async verifyOnPage(superPage: Page): Promise<CheckYourAnswersPage> {
    const page = new CheckYourAnswersPage(superPage)
    await expect(page.header).toBeVisible()
    await expect(page.caption).toBeVisible()
    return page
  }
}
