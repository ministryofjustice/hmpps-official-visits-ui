import type { Express } from 'express'
import request from 'supertest'
import cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import AuditService, { Page } from '../../../../services/auditService'
import config from '../../../../config'

jest.mock('../../../../services/auditService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({
    services: { auditService },
    userSupplier: () => user,
  })
  config.maintenanceMode = false
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /home', () => {
  it('should render home page', () => {
    auditService.logPageView.mockResolvedValue(null)
    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Official Visits')

        // Get the card contents in a better way by finding classes
        expect(res.text).toContain('Book an official visit')
        expect(res.text).toContain('View available slots for official visits')
        expect(res.text).toContain('View or cancel existing official visits')
        expect(res.text).toContain('Administer days, slots and locations for official visits')

        expect(auditService.logPageView).toHaveBeenCalledWith(Page.HOME_PAGE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })

  it('user should see a scheduled maintenance screen', () => {
    config.maintenanceMode = true
    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(res => {
        const $ = cheerio.load(res.text)
        const heading = $('h1').text().trim()

        expect(heading).toContain('Sorry, scheduled maintenance affects this service')
      })
  })
})
