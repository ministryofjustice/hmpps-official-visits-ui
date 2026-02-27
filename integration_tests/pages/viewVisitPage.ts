import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'
import { summaryValue } from '../testUtils'

export default class ViewVisitPage extends AbstractPage {
  readonly header: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Official visit' })
  }

  static async verifyOnPage(page: Page): Promise<ViewVisitPage> {
    const viewVisitPage = new ViewVisitPage(page)
    await expect(viewVisitPage.header).toBeVisible()

    await expect(page.locator('.govuk-hint')).toHaveText('Manage existing official visits')

    const links = page.locator('.govuk-link')
    const buttons = page.locator('.govuk-button')

    await expect(links.nth(0)).toContainText('Cancel visit')
    await expect(links.nth(1)).toContainText('Complete visit')

    await expect(buttons.nth(0)).toHaveText('Print movement slip')
    await expect(buttons.nth(1)).toHaveText('Amend visit')

    await viewVisitPage.verifyNoAccessViolationsOnPage()

    return viewVisitPage
  }

  async verifySummaryValues(key: string, value: string) {
    await expect(summaryValue(this.page, key)).toHaveText(value)
  }
}
