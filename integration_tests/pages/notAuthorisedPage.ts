import { expect, Locator, Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export class NotAuthorisedPage extends AbstractPage {
  readonly header: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: `You do not have permission to access this page` })
  }

  static async verifyOnPage(superPage: Page) {
    const page = new NotAuthorisedPage(superPage)
    expect(await superPage.title()).toEqual('Not authorised - Official visits - DPS')
    expect(page.header).toHaveText('You do not have permission to access this page')
    expect(superPage.getByText('have the correct permissions to use the official visits service')).toBeVisible()
    await page.verifyNoAccessViolationsOnPage()
    return page
  }
}
