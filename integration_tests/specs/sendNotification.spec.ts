import { expect, test } from '@playwright/test'
import hmppsAuth from '../mockApis/hmppsAuth'
import manageUsersApi from '../mockApis/manageUsersApi'
import componentsApi from '../mockApis/componentsApi'
import prisonApi from '../mockApis/prisonApi'
import officialVisitsApi from '../mockApis/officialVisitsApi'
import { login, resetStubs } from '../testUtils'
import { mockVisitByIdVisit } from '../../server/testutils/mocks'
import NotificationEmailPage from '../pages/notificationEmailPage'
import NotificationVideoLinkPage from '../pages/notificationVideoLinkPage'
import NotificationCheckPage from '../pages/notificationCheckPage'
import NotificationSentPage from '../pages/notificationSentPage'
import { AuthorisedRoles } from '../../server/middleware/populateUserPermissions'
import { NotAuthorisedPage } from '../pages/notAuthorisedPage'
import { OfficialVisitNotifications } from '../../server/@types/officialVisitsApi/types'

const OV_ID = mockVisitByIdVisit.officialVisitId // 1

test.describe('Notification feature toggle', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await manageUsersApi.stubGetByUsername()
    await prisonApi.stubGetPrisonerImage()
    await officialVisitsApi.stubGetOfficialVisitById(mockVisitByIdVisit)
    await officialVisitsApi.getNotificationsByOfficialVisitId(OV_ID, [] as OfficialVisitNotifications)
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('should redirect to home when notifications are disabled for the user prison', async ({ page }) => {
    await componentsApi.stubComponents('BXI', 'Brixton (HMP)')
    await login(page)
    await page.goto(`/notification/enter-email-address/${OV_ID}/create`)
    await expect(page).toHaveURL('/')
  })

  test('should allow access to notifications when enabled for the user prison', async ({ page }) => {
    await componentsApi.stubComponents('LEI', 'Leeds (HMP)')
    await login(page)
    await page.goto(`/notification/enter-email-address/${OV_ID}/create`)
    await expect(page).not.toHaveURL('/')
    await NotificationEmailPage.verifyOnPage(page)
  })
})

test.describe('Send a notification', () => {
  test.beforeEach(async () => {
    await hmppsAuth.stubSignInPage()
    await manageUsersApi.stubGetByUsername()
    await componentsApi.stubComponents()
    await prisonApi.stubGetPrisonerImage()
    await officialVisitsApi.getNotificationsByOfficialVisitId(OV_ID, [] as OfficialVisitNotifications)
    await officialVisitsApi.stubGetOfficialVisitById(mockVisitByIdVisit)
    await officialVisitsApi.stubSendNotification(OV_ID)
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('RBAC: should deny access to users without MANAGE permission', async ({ page }) => {
    await login(page, {
      name: 'AUser',
      roles: [`ROLE_${AuthorisedRoles.DEFAULT}`],
      active: true,
      authSource: 'nomis',
    })
    await page.goto(`/notification/enter-email-address/${OV_ID}/create`)
    await NotAuthorisedPage.verifyOnPage(page)
  })

  test.describe('Create journey', () => {
    test('Happy path: enter email → check → sent (create)', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      // --- Email page ---
      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await expect(
        emailPage.page.getByText('An email will be sent confirming the details of this official visit.'),
      ).toBeVisible()

      await emailPage.fillEmail('visitor@example.com')
      await emailPage.continueButton.click()

      // --- Video link page ---
      const videoLinkPage = await NotificationVideoLinkPage.verifyOnPage(page)
      await videoLinkPage.fillVideoLink('https://video.example.com/create-room')
      await videoLinkPage.continueButton.click()

      // --- Check page ---
      const checkPage = await NotificationCheckPage.verifyOnPage(page)
      await expect(checkPage.header).toHaveText('Check and send official visit confirmation')
      await expect(
        checkPage.page.getByText('A confirmation email will be sent confirming the details of this official visit.'),
      ).toBeVisible()
      await expect(checkPage.page.locator('.govuk-summary-list__value').first()).toContainText('visitor@example.com')
      // Visit details from mockVisitByIdVisit
      await expect(checkPage.page.getByText('Tim Harrison')).toBeVisible()
      await expect(checkPage.page.getByText('Video', { exact: true })).toBeVisible()
      await expect(checkPage.page.getByText('Friday, 25 December 2099')).toBeVisible()
      await expect(checkPage.page.getByText('https://video.example.com/create-room')).toBeVisible()
      // Send button label for create
      await expect(checkPage.sendButton).toHaveText('Send official visit confirmation')

      await checkPage.sendButton.click()

      // --- Sent page ---
      const sentPage = await NotificationSentPage.verifyOnPage(page)
      await expect(sentPage.panel).toContainText('An email will be sent confirming details of this official visit.')
      await expect(sentPage.panel).toContainText('visitor@example.com')
      await expect(sentPage.viewVisitLink).toBeVisible()
      await expect(
        sentPage.page.getByText('If you update or cancel this visit, you should send another email.'),
      ).toBeVisible()
    })

    test('Validation: shows error for empty email on create', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await emailPage.continueButton.click()

      // Redirected back to same page with validation error
      await NotificationEmailPage.verifyOnPage(page)
      await expect(emailPage.page.locator('.govuk-error-message')).toContainText('Enter an email address')
    })

    test('Validation: shows error for invalid email format on create', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await emailPage.fillEmail('not-a-valid-email')
      await emailPage.continueButton.click()

      // Browser blocks invalid type=email before submit, so assert native validation is shown.
      await NotificationEmailPage.verifyOnPage(page)
      await expect(page).toHaveURL(`/notification/enter-email-address/${OV_ID}/create`)
      const validationMessage = await emailPage
        .emailInput()
        .evaluate((input: HTMLInputElement) => input.validationMessage)
      expect(validationMessage).not.toHaveLength(0)
    })

    test('Change email link on check page navigates back to email page', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await emailPage.fillEmail('visitor@example.com')
      await emailPage.continueButton.click()

      const videoLinkPage = await NotificationVideoLinkPage.verifyOnPage(page)
      await videoLinkPage.fillVideoLink('https://video.example.com/change-link')
      await videoLinkPage.continueButton.click()

      const checkPage = await NotificationCheckPage.verifyOnPage(page)
      await checkPage.changeLinkFor('Email address').click()

      await NotificationEmailPage.verifyOnPage(page)
      expect(page.url()).toContain(`/notification/enter-email-address/${OV_ID}/create`)
    })

    test('Change video link on check page navigates back to video link page', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await emailPage.fillEmail('visitor@example.com')
      await emailPage.continueButton.click()

      const videoLinkPage = await NotificationVideoLinkPage.verifyOnPage(page)
      await videoLinkPage.fillVideoLink('https://video.example.com/change-link')
      await videoLinkPage.continueButton.click()

      const checkPage = await NotificationCheckPage.verifyOnPage(page)
      await checkPage.changeLinkFor('Video link').click()

      await NotificationVideoLinkPage.verifyOnPage(page)
    })

    test('Validation: shows error for empty video link on create', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await emailPage.fillEmail('visitor@example.com')
      await emailPage.continueButton.click()

      const videoLinkPage = await NotificationVideoLinkPage.verifyOnPage(page)
      await videoLinkPage.continueButton.click()

      await NotificationVideoLinkPage.verifyOnPage(page)
      await expect(videoLinkPage.page.locator('.govuk-error-message')).toContainText('Enter the video link in full')
    })

    test('Validation: shows error for invalid https video link on create', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await emailPage.fillEmail('visitor@example.com')
      await emailPage.continueButton.click()

      const videoLinkPage = await NotificationVideoLinkPage.verifyOnPage(page)
      await videoLinkPage.fillVideoLink('http://video.example.com/not-secure')
      await videoLinkPage.continueButton.click()

      await NotificationVideoLinkPage.verifyOnPage(page)
      await expect(videoLinkPage.page.locator('.govuk-error-message')).toContainText(
        'Enter a valid video link that starts with https://',
      )
    })
  })

  test.describe('Multiple email addresses', () => {
    test('Happy path: add a second address and send to both', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await expect(emailPage.items).toHaveCount(1)
      await expect(emailPage.removeButton(0)).toBeHidden()

      await emailPage.fillEmail('first@example.com')
      await emailPage.addAnother()

      await expect(emailPage.items).toHaveCount(2)
      await emailPage.fillEmail('second@example.com', 1)
      await expect(emailPage.emailInput(0)).toHaveValue('first@example.com')
      await emailPage.verifyNoAccessViolationsOnPage()

      await emailPage.continueButton.click()

      const videoLinkPage = await NotificationVideoLinkPage.verifyOnPage(page)
      await videoLinkPage.fillVideoLink('https://video.example.com/multi-room')
      await videoLinkPage.continueButton.click()

      const checkPage = await NotificationCheckPage.verifyOnPage(page)
      const emailRow = checkPage.page.locator('.govuk-summary-list__value').first()
      await expect(emailRow).toContainText('first@example.com')
      await expect(emailRow).toContainText('second@example.com')

      await checkPage.sendButton.click()

      const sentPage = await NotificationSentPage.verifyOnPage(page)
      await expect(sentPage.panel).toContainText('first@example.com')
      await expect(sentPage.panel).toContainText('second@example.com')
    })

    test('Removing an item renumbers the remaining ones', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await emailPage.fillEmail('first@example.com')
      await emailPage.addAnother()
      await emailPage.fillEmail('second@example.com', 1)
      await emailPage.addAnother()
      await emailPage.fillEmail('third@example.com', 2)

      await expect(emailPage.items).toHaveCount(3)

      await emailPage.removeButton(1).click()

      await expect(emailPage.items).toHaveCount(2)
      await expect(emailPage.emailInput(0)).toHaveValue('first@example.com')
      await expect(emailPage.emailInput(1)).toHaveValue('third@example.com')
      await emailPage.verifyNoAccessViolationsOnPage()

      await emailPage.continueButton.click()

      const videoLinkPage = await NotificationVideoLinkPage.verifyOnPage(page)
      await videoLinkPage.fillVideoLink('https://video.example.com/renumber-room')
      await videoLinkPage.continueButton.click()

      const checkPage = await NotificationCheckPage.verifyOnPage(page)
      const emailRow = checkPage.page.locator('.govuk-summary-list__value').first()
      await expect(emailRow).toContainText('first@example.com')
      await expect(emailRow).toContainText('third@example.com')
      await expect(emailRow).not.toContainText('second@example.com')
    })

    test('Validation: reports the item that was left empty', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/create`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await emailPage.fillEmail('first@example.com')
      await emailPage.addAnother()
      await emailPage.continueButton.click()

      await NotificationEmailPage.verifyOnPage(page)
      await expect(page.locator('.govuk-error-message')).toContainText('Enter an email address')
      await expect(page.locator('.govuk-error-summary a')).toHaveAttribute('href', '#emailAddresses[1]')
      await expect(emailPage.emailInput(0)).toHaveValue('first@example.com')
    })
  })

  test.describe('Amend (edit) journey', () => {
    test('RBAC: should deny access to users without MANAGE permission', async ({ page }) => {
      await login(page, {
        name: 'AUser',
        roles: [`ROLE_${AuthorisedRoles.DEFAULT}`],
        active: true,
        authSource: 'nomis',
      })
      await page.goto(`/notification/enter-email-address/${OV_ID}/edit`)
      await NotAuthorisedPage.verifyOnPage(page)
    })

    test('Happy path: enter email → check → sent (edit)', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/edit`)

      // --- Email page ---
      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await expect(
        emailPage.page.getByText('An email will be sent confirming the details of this official visit.'),
      ).toBeVisible()

      await emailPage.fillEmail('amend@example.com')
      await emailPage.continueButton.click()

      // --- Video link page ---
      const videoLinkPage = await NotificationVideoLinkPage.verifyOnPage(page)
      await videoLinkPage.fillVideoLink('https://video.example.com/amend-room')
      await videoLinkPage.continueButton.click()

      // --- Check page ---
      const checkPage = await NotificationCheckPage.verifyOnPage(page)
      await expect(checkPage.header).toHaveText('Check and send official visit confirmation')
      await expect(
        checkPage.page.getByText('A confirmation email will be sent confirming the details of this official visit.'),
      ).toBeVisible()
      await expect(checkPage.page.locator('.govuk-summary-list__value').first()).toContainText('amend@example.com')
      await expect(checkPage.sendButton).toHaveText('Send official visit confirmation')

      await checkPage.sendButton.click()

      // --- Sent page ---
      const sentPage = await NotificationSentPage.verifyOnPage(page)
      await expect(sentPage.panel).toContainText('An email will be sent confirming details of this official visit.')
      await expect(sentPage.panel).toContainText('amend@example.com')
    })
  })

  test.describe('Cancel journey', () => {
    test('RBAC: should deny access to users without MANAGE permission', async ({ page }) => {
      await login(page, {
        name: 'AUser',
        roles: [`ROLE_${AuthorisedRoles.DEFAULT}`],
        active: true,
        authSource: 'nomis',
      })
      await page.goto(`/notification/enter-email-address/${OV_ID}/cancel`)
      await NotAuthorisedPage.verifyOnPage(page)
    })

    test('Happy path: enter email → check → sent (cancel)', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/cancel`)

      // --- Email page ---
      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await expect(
        emailPage.page.getByText('An email will be sent confirming the cancellation of this official visit.'),
      ).toBeVisible()
      // Should NOT show the "details" text
      await expect(
        emailPage.page.getByText('An email will be sent confirming the details of this official visit.'),
      ).not.toBeVisible()

      await emailPage.fillEmail('cancel@example.com')
      await emailPage.continueButton.click()

      // --- Video link page ---
      const videoLinkPage = await NotificationVideoLinkPage.verifyOnPage(page)
      await videoLinkPage.fillVideoLink('https://video.example.com/cancel-room')
      await videoLinkPage.continueButton.click()

      // --- Check page ---
      const checkPage = await NotificationCheckPage.verifyOnPage(page)
      await expect(checkPage.header).toHaveText('Check and send official visit cancellation')
      await expect(
        checkPage.page.getByText('An email will be sent confirming the cancellation of this official visit.'),
      ).toBeVisible()
      await expect(checkPage.page.locator('.govuk-summary-list__value').first()).toContainText('cancel@example.com')
      // Send button label for cancel
      await expect(checkPage.sendButton).toHaveText('Send official visit cancellation')

      await checkPage.sendButton.click()

      // --- Sent page ---
      const sentPage = await NotificationSentPage.verifyOnPage(page)
      await expect(sentPage.panel).toContainText(
        'An email will be sent confirming this official visit has been cancelled.',
      )
      await expect(sentPage.panel).toContainText('cancel@example.com')
      // Cancel action should NOT show the update/cancel reminder text
      await expect(
        sentPage.page.getByText('If you update or cancel this visit, you should send another email.'),
      ).not.toBeVisible()
      await expect(
        sentPage.page.getByText('You should check to confirm this email has been sent successfully.'),
      ).toBeVisible()
    })

    test('Validation: shows error for empty email on cancel', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/enter-email-address/${OV_ID}/cancel`)

      const emailPage = await NotificationEmailPage.verifyOnPage(page)
      await emailPage.continueButton.click()

      await NotificationEmailPage.verifyOnPage(page)
      await expect(emailPage.page.locator('.govuk-error-message')).toContainText('Enter an email address')
    })
  })

  test.describe('Session guard: redirect when no email in session', () => {
    test('GET check page without email redirects to email entry', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/check-email/${OV_ID}/create`)

      // Should be redirected back to the email entry page
      await NotificationEmailPage.verifyOnPage(page)
      expect(page.url()).toContain(`/notification/enter-email-address/${OV_ID}/create`)
    })

    test('GET sent page without email redirects to email entry', async ({ page }) => {
      await login(page)
      await page.goto(`/notification/email-confirmation/${OV_ID}/create`)

      // Should be redirected back to the email entry page
      await NotificationEmailPage.verifyOnPage(page)
      expect(page.url()).toContain(`/notification/enter-email-address/${OV_ID}/create`)
    })
  })
})
