import { type Locator, type Page } from '@playwright/test'

export default class AbstractPage {
  readonly page: Page

  /** user name that appear in header */
  readonly usersName: Locator

  /** phase banner that appear in header */
  readonly phaseBanner: Locator

  /** link to sign out */
  readonly signoutLink: Locator

  readonly continueButton: Locator

  readonly cancelLink: Locator

  protected constructor(page: Page) {
    this.page = page
    this.phaseBanner = page.getByTestId('header-phase-banner')
    this.usersName = page.getByTestId('header-user-name')
    this.signoutLink = page.getByText('Sign out')
    this.continueButton = page.getByRole('button', { name: 'Continue' })
    this.cancelLink = page.getByText('Cancel and return to homepage')
  }

  async signOut() {
    await this.signoutLink.first().click()
  }

  async selectRadioButton(text: string) {
    await this.page.getByRole('radio', { name: text }).click()
  }

  async selectCheckbox(text: string) {
    await this.page.getByRole('checkbox', { name: text }).click()
  }
}
