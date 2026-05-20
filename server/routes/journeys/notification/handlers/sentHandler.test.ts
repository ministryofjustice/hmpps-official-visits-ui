import type { Express } from 'express'
import { RequestHandler } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import AuditService from '../../../../services/auditService'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/telemetryService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express

const OV_ID = '1'

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

describe('notification sent handler', () => {
  it('GET should redirect to enter email page when email is missing', async () => {
    await request(app)
      .get(`/notification/${OV_ID}/create/sent`)
      .expect(302)
      .expect('location', `/notification/${OV_ID}/create`)
  })

  it('GET should render sent confirmation with email and links', async () => {
    let capturedSession: { notifications?: Record<string, { emailAddress?: string }> } | null = null

    app = appWithAllRoutes({
      services: { auditService },
      userSupplier: () => user,
      journeySessionSupplier: () => ({}),
      middlewares: [
        ((req, _res, next) => {
          const session = req.session as unknown as { notifications?: Record<string, { emailAddress?: string }> }
          session.notifications = session.notifications || {}
          session.notifications[OV_ID] = { emailAddress: 'example@example.com' }
          capturedSession = session
          next()
        }) as RequestHandler,
      ],
    })

    const res = await request(app).get(`/notification/${OV_ID}/create/sent`).expect(200)
    const $ = cheerio.load(res.text)

    const $govuk = $('.govuk-panel--confirmation')
    expect($govuk.length).toBeTruthy()
    expect($govuk.text()).toContain('An email will be sent confirming details of this official visit.')
    expect($govuk.text()).toContain('example@example.com')
    expect($('.govuk-body').text()).toContain(
      'You should check to confirm this email has been sent successfully. If you update or cancel this visit, you should send another email.',
    )
    // find the link that points to the view visit URL
    const viewLink = $(`a.govuk-link[href="/view/visit/${OV_ID}"]`)
    expect(viewLink.length).toBe(1)
    // assert session is reset
    expect(capturedSession!.notifications).toEqual({ [OV_ID]: {} })
  })

  it('GET should show cancellation text in body for cancel action', async () => {
    app = appWithAllRoutes({
      services: { auditService },
      userSupplier: () => user,
      journeySessionSupplier: () => ({}),
      middlewares: [
        ((req, _res, next) => {
          const session = req.session as unknown as { notifications?: Record<string, { emailAddress?: string }> }
          session.notifications = session.notifications || {}
          session.notifications[OV_ID] = { emailAddress: 'example@example.com' }
          next()
        }) as RequestHandler,
      ],
    })

    const res = await request(app).get(`/notification/${OV_ID}/cancel/sent`).expect(200)
    const $ = cheerio.load(res.text)

    const $govuk1 = $('.govuk-panel--confirmation')
    expect($govuk1.length).toBeTruthy()
    expect($govuk1.text()).toContain('this official visit has been cancelled')
    expect($govuk1.text()).not.toContain('An email will be sent confirming details of this official visit.')
    expect($govuk1.text()).toContain('example@example.com')
    expect($('.govuk-body').text()).toContain('You should check to confirm this email has been sent successfully.')
  })
})
