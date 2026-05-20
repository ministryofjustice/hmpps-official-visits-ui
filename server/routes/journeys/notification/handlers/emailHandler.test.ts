import { Express, RequestHandler } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import AuditService, { Page } from '../../../../services/auditService'
import { getPageHeader } from '../../../testutils/cheerio'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'

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
  appSetup()
})

afterEach(() => {
  jest.resetAllMocks()
})

const OV_ID = '1'
const URL = `/notification/${OV_ID}/create`

describe('notification email handler', () => {
  describe('GET', () => {
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

    it('should accept a valid email and persist it to session then redirect to check', async () => {
      const agent = request.agent(app)

      await agent
        .post(URL)
        .send({ emailAddress: 'example@example.com' })
        .expect(302)
        .expect('location', '/notification/1/create/check')

      // Follow redirect with same agent to ensure session cookie is preserved
      await agent
        .get('/notification/1/create/check')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          // Email is shown in the summary list value
          expect($('.govuk-summary-list__value').first().text()).toContain('example@example.com')
        })
    })
  })
})
