import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class AmendVisitPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  readonly cancelButton: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Official visit' })
    this.caption = page.locator('.govuk-caption-l')
    this.cancelButton = page.locator('a', { hasText: 'Cancel' })
  }

  static async verifyOnPage(page: Page): Promise<AmendVisitPage> {
    const amendVisitPage = new AmendVisitPage(page)
    await expect(amendVisitPage.header).toBeVisible()

    await expect(page.locator('.govuk-hint')).toHaveText('Manage existing official visits')

    await expect(amendVisitPage.cancelButton).toBeVisible()
    expect(await page.locator('a', { hasText: 'Change' }).count()).toBeGreaterThan(6)
    await expect(page.locator('a', { hasText: 'Add or remove visitors' })).toBeVisible()

    await amendVisitPage.verifyNoAccessViolationsOnPage()
    return amendVisitPage
  }

  getCancelButton(): Locator {
    return this.cancelButton
  }
}
