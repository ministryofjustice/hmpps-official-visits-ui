import { Express, RequestHandler } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import AuditService, { Page } from '../../../../services/auditService'
import { getPageHeader } from '../../../testutils/cheerio'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import config from '../../../../config'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/telemetryService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express

const OV_ID = '1'
const URL = `/notification/add-video-link/${OV_ID}/create`

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
  appSetup([
    (req, _res, next) => {
      req.session.notifications = { [OV_ID]: { emailAddresses: ['example@example.com'] } }
      next()
    },
  ])
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('notification video link handler', () => {
  describe('GET', () => {
    it('should redirect to enter email page if there is no email in session', async () => {
      appSetup()

      await request(app).get(URL).expect(302).expect('location', `/notification/enter-email-address/${OV_ID}/create`)
    })

    it('should render add video link page', async () => {
      await request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('.govuk-back-link').attr('href')).toEqual('/notification/enter-email-address/1/create')
          expect(getPageHeader($)).toEqual('Add video link')
          expect($('#videoLinkUrl').val()).toBeUndefined()
          expect($('.govuk-button').text()).toContain('Continue')
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.NOTIFICATION_VIDEO_LINK_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should populate the input when session contains a video link', async () => {
      appSetup([
        (req, _res, next) => {
          req.session.notifications = {
            [OV_ID]: { emailAddresses: ['example@example.com'], videoLinkUrl: 'https://video.example.com/room-1' },
          }
          next()
        },
      ])

      await request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('#videoLinkUrl').attr('value')).toEqual('https://video.example.com/room-1')
        })
    })
  })

  describe('POST', () => {
    it('should validate and show an error for empty video link', () => {
      return request(app)
        .post(URL)
        .send({ videoLinkUrl: '' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'videoLinkUrl',
              href: '#videoLinkUrl',
              text: 'Enter the video link in full',
            },
          ]),
        )
    })

    it('should reject non-https video link', async () => {
      const agent = request.agent(app)

      await agent
        .post(URL)
        .send({ videoLinkUrl: 'http://video.example.com/room-1' })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'videoLinkUrl',
              href: '#videoLinkUrl',
              text: 'Enter a valid video link that starts with https://',
            },
          ]),
        )
    })

    it('should accept a valid https video link and redirect to check page', async () => {
      await request(app)
        .post(URL)
        .send({ videoLinkUrl: 'https://video.example.com/room-1' })
        .expect(302)
        .expect('location', `/notification/check-email/${OV_ID}/create`)
    })

    it('should redirect to enter email if session email is missing', async () => {
      appSetup()

      await request(app)
        .post(URL)
        .send({ videoLinkUrl: 'https://video.example.com/room-1' })
        .expect(302)
        .expect('location', `/notification/enter-email-address/${OV_ID}/create`)
    })
  })
})
