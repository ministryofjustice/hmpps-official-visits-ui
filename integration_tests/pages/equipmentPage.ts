import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class EquipmentPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: `Will visitors have equipment with them? (optional)` })
    this.caption = page.locator('.govuk-hint', { hasText: 'Schedule an official visit' })
  }

  static async verifyOnPage(superPage: Page): Promise<EquipmentPage> {
    const page = new EquipmentPage(superPage)
    await expect(page.header).toBeVisible()
    await expect(page.caption).toBeVisible()
    await expect(page.continueButton).toBeVisible()
    await expect(page.cancelLink).toBeVisible()
    await page.verifyNoAccessViolationsOnPage()
    return page
  }

  async fillBoxForContact(index: number, notes: string) {
    await this.page.locator(`#equipment\\[${index}\\]\\[notes\\]`).fill(notes)
  }
}
