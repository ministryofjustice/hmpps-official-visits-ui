import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

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

    await expect(page.locator('.govuk-link', { hasText: 'Cancel visit' })).toHaveAttribute(
      'href',
      /\/view\/visit\/1\/cancel\?backTo=.*/,
    )
    await expect(page.locator('.govuk-link', { hasText: 'Complete visit' })).toHaveAttribute(
      'href',
      /\/view\/visit\/1\/complete\?backTo=.*/,
    )
    await expect(page.locator('.govuk-button', { hasText: 'Print movement slip' })).toHaveAttribute(
      'href',
      '/view/visit/1/movement-slip',
    )
    await expect(page.locator('.govuk-button', { hasText: 'Amend visit' })).toHaveAttribute(
      'href',
      /\/manage\/amend\/1\?backTo=.*/,
    )

    await viewVisitPage.verifyNoAccessViolationsOnPage()

    return viewVisitPage
  }
}
