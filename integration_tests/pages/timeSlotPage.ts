import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class TimeSlotPage extends AbstractPage {
  readonly header: Locator

  readonly caption: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Select date and time of official visit' })
    this.caption = page.locator('.govuk-hint', { hasText: 'Schedule an official visit' })
  }

  static async verifyOnPage(superPage: Page): Promise<TimeSlotPage> {
    const page = new TimeSlotPage(superPage)
    await expect(page.header).toBeVisible()
    await expect(page.caption).toBeVisible()
    await expect(page.continueButton).toBeVisible()
    await expect(page.cancelLink).toBeVisible()
    await page.verifyNoAccessViolationsOnPage()
    return page
  }
}
