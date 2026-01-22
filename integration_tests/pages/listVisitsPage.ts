import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ListVisitsPage extends AbstractPage {
  readonly header: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Search for an official visit' })
  }

  static async verifyOnPage(page: Page): Promise<ListVisitsPage> {
    const homePage = new ListVisitsPage(page)
    await expect(homePage.header).toBeVisible()
    return homePage
  }

  getSearchBox() {
    return this.page.getByRole('textbox', { name: 'Search by prisoner name or' })
  }

  getSearchButton() {
    return this.page.getByRole('button', { name: 'Search' })
  }

  getFromDateInput() {
    return this.page.getByRole('textbox', { name: 'From' })
  }

  getFromDateSelector() {
    return this.page.getByRole('button', { name: 'Choose date' }).first()
  }

  getToDateInput() {
    return this.page.getByRole('textbox', { name: 'To' })
  }

  getToDateSelector() {
    return this.page.getByRole('button', { name: 'Choose date' }).nth(1)
  }

  getShowFilterButton() {
    return this.page.getByRole('button', { name: 'Show filter' })
  }

  getNextPageLink() {
    return this.page.getByRole('link', { name: 'Next' }).first()
  }

  getApplyFiltersButton() {
    return this.page.getByRole('button', { name: 'Apply filters' })
  }

  getLocationFilter() {
    return this.page.getByLabel('Location')
  }

  getTypeFilter() {
    return this.page.getByLabel('Type')
  }

  getStatusFilter() {
    return this.page.getByLabel('Status')
  }

  getRemoveFilter(text: string) {
    return this.page.getByRole('link', { name: `Remove this filter ${text}` })
  }
}
