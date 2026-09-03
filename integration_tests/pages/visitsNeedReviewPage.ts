import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class VisitsNeedReviewPage extends AbstractPage {
  readonly header: Locator

  readonly resultsSummary: Locator

  readonly noResults: Locator

  readonly whichChecksDetails: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Official visits that need review' })
    this.resultsSummary = page.getByTestId('results-summary')
    this.noResults = page.getByTestId('no-results')
    this.whichChecksDetails = page.getByTestId('which-checks-details')
  }

  static async verifyOnPage(superPage: Page): Promise<VisitsNeedReviewPage> {
    const page = new VisitsNeedReviewPage(superPage)
    await expect(page.header).toBeVisible()
    await page.verifyNoAccessViolationsOnPage()
    return page
  }

  getRows() {
    return this.page.locator('tbody .govuk-table__row')
  }

  getRowFor(prisonerName: string) {
    return this.page.locator('tbody .govuk-table__row', { hasText: prisonerName })
  }

  getReasonTagsFor(prisonerName: string) {
    return this.getRowFor(prisonerName).locator('.govuk-tag')
  }

  getActionsFor(prisonerName: string) {
    return this.getRowFor(prisonerName).locator('.review-actions')
  }

  getNextPageLink() {
    return this.page.getByRole('link', { name: 'Next' }).first()
  }
}
