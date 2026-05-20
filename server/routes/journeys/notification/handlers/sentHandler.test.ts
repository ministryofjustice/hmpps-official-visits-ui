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
  it('GET should render sent confirmation with email and links', async () => {
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

    const res = await request(app).get(`/notification/${OV_ID}/create/sent`).expect(200)
    const $ = cheerio.load(res.text)

    expect($('.govuk-panel--confirmation').length).toBeTruthy()
    expect($('.govuk-panel--confirmation').text()).toContain(
      'An email will be sent confirming details of this official visit',
    )
    expect($('.govuk-panel--confirmation').text()).toContain('example@example.com')
    // find the link that points to the view visit URL
    const viewLink = $(`a.govuk-link[href="/view/visit/${OV_ID}"]`)
    expect(viewLink.length).toBe(1)
  })
})
