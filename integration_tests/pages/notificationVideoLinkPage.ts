import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class NotificationVideoLinkPage extends AbstractPage {
  readonly header: Locator

  readonly videoLinkInput: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.locator('h1', { hasText: 'Add video link' })
    this.videoLinkInput = page.locator('#videoLinkUrl')
  }

  static async verifyOnPage(page: Page): Promise<NotificationVideoLinkPage> {
    const videoLinkPage = new NotificationVideoLinkPage(page)
    await expect(videoLinkPage.header).toBeVisible()
    await videoLinkPage.verifyNoAccessViolationsOnPage()
    return videoLinkPage
  }

  async fillVideoLink(videoLinkUrl: string) {
    await this.videoLinkInput.fill(videoLinkUrl)
  }
}
