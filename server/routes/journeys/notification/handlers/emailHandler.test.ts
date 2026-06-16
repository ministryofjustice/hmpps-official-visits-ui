import { Express, RequestHandler } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user, flashProvider } from '../../../testutils/appSetup'
import type { HmppsUser } from '../../../../interfaces/hmppsUser'
import { Permission } from '../../../../interfaces/hmppsUser'
import AuditService, { Page } from '../../../../services/auditService'
import { getPageHeader } from '../../../testutils/cheerio'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import config from '../../../../config'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/telemetryService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express

const appSetup = (middlewares: RequestHandler[] = []) => {
  app = appWithAllRoutes({
    services: { auditService },
    userSupplier: () => user,
    journeySessionSupplier: () => ({}),
    middlewares,
  })
}

beforeEach(() => {
  config.featureToggles.emailNotificationsPrisons = 'HEI'
  appSetup()
})

afterEach(() => {
  jest.resetAllMocks()
})

const OV_ID = '1'
const URL = `/notification/enter-email-address/${OV_ID}/create`

describe('notification email handler', () => {
  describe('GET', () => {
    it('should render the not-authorised page if user does not have MANAGE permission', () => {
      const userWithoutPermission: HmppsUser = {
        ...user,
        userRoles: [],
        permissions: { OV: Permission.DEFAULT },
      }

      const appWithoutPermission = appWithAllRoutes({
        services: { auditService },
        userSupplier: () => userWithoutPermission,
        journeySessionSupplier: () => ({}),
      })

      return request(appWithoutPermission)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(200)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect(getPageHeader($)).toEqual('You do not have permission to access this page')
          expect(res.text).toContain('have the correct permissions to use the official visits service')
          expect(auditService.logPageView).not.toHaveBeenCalled()
        })
    })

    it('should render the enter email page when no session email present', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('Enter an email address')
          expect($('#emailAddress').val()).toBeUndefined()
          expect($('.govuk-button').text()).toContain('Continue')
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.NOTIFICATION_ENTER_EMAIL_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should show visit details text for create action', () => {
      return request(app)
        .get(`/notification/enter-email-address/${OV_ID}/create`)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('An email will be sent confirming the details of this official visit.')
          expect(res.text).not.toContain('the cancellation of this official visit')
        })
    })

    it('should show visit details text for edit action', () => {
      return request(app)
        .get(`/notification/enter-email-address/${OV_ID}/edit`)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('An email will be sent confirming the details of this official visit.')
          expect(res.text).not.toContain('the cancellation of this official visit')
        })
    })

    it('should show cancellation text for cancel action', () => {
      return request(app)
        .get(`/notification/enter-email-address/${OV_ID}/cancel`)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('An email will be sent confirming the cancellation of this official visit.')
          expect(res.text).not.toContain('the details of this official visit')
        })
    })

    it('should populate the input when session contains an email', () => {
      // Add middleware to set session value prior to handler
      const mw: RequestHandler = (req, _res, next) => {
        // populate both legacy and new notifications map for OV_ID
        const session = req.session as unknown as { notifications?: Record<string, { emailAddress?: string }> }
        session.notifications = session.notifications || {}
        session.notifications[OV_ID] = { emailAddress: 'example@example.com' }
        next()
      }

      appSetup([mw])

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('#emailAddress').attr('value')).toEqual('example@example.com')
        })
    })
  })

  describe('POST', () => {
    it('should validate and show an error for empty email', () => {
      return request(app)
        .post(URL)
        .send({ emailAddress: '' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'emailAddress',
              href: '#emailAddress',
              text: 'Enter an email address',
            },
          ]),
        )
    })

    it('should reject malformed email and prepopulate the field without modifying it', async () => {
      const malformedEmail = 'prabash.balasuriya@justice.gov.uk45E£'
      const flashStore: Record<string, string[]> = {}

      flashProvider.mockImplementation((name: string, value?: string) => {
        if (typeof value !== 'undefined') {
          flashStore[name] = flashStore[name] || []
          flashStore[name].push(value)
          return []
        }

        const values = flashStore[name] || []
        flashStore[name] = []
        return values
      })

      const agent = request.agent(app)

      await agent
        .post(URL)
        .set('Referrer', URL)
        .send({ emailAddress: malformedEmail })
        .expect(302)
        .expect('location', URL)

      await agent
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect(getPageHeader($)).toEqual('Enter an email address')
          expect(res.text).toContain('Enter an email address in the correct format')
          expect($('#emailAddress').attr('value')).toEqual(malformedEmail)
        })
    })

    it('should accept a valid email and persist it to session then redirect to check', async () => {
      const agent = request.agent(app)

      await agent
        .post(URL)
        .send({ emailAddress: 'example@example.com' })
        .expect(302)
        .expect('location', '/notification/check-email/1/create')

      // Follow redirect with same agent to ensure session cookie is preserved
      await agent
        .get('/notification/check-email/1/create')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          // Email is shown in the summary list value
          expect($('.govuk-summary-list__value').first().text()).toContain('example@example.com')
        })
    })
  })
})
