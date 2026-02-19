import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CancellationCheckPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  readonly noButton: Locator

  readonly yesButton: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: `Are you sure you want to cancel and delete this official visit?` })
    this.caption = page.locator('.govuk-hint', { hasText: 'Schedule an official visit' })
    this.noButton = page.getByRole('button', { name: 'No, return to creating a visit' })
    this.yesButton = page.getByRole('button', { name: 'Yes, cancel the visit' })
  }

  static async verifyOnPage(superPage: Page): Promise<CancellationCheckPage> {
    const page = new CancellationCheckPage(superPage)
    await expect(page.header).toBeVisible()
    await expect(page.caption).toBeVisible()
    await expect(page.noButton).toBeVisible()
    await expect(page.yesButton).toBeVisible()
    return page
  }
}
