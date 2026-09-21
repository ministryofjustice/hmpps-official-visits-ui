import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import AuditService, { Page } from '../../../../services/auditService'
import config from '../../../../config'

jest.mock('../../../../services/auditService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express

beforeEach(() => {
  config.maintenanceMode = false
  app = appWithAllRoutes({
    services: { auditService },
    userSupplier: () => ({ ...user, userRoles: [] }),
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /accessibility-statement', () => {
  it('should render the statement for a user with no official visits roles', () => {
    return request(app)
      .get('/accessibility-statement')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        expect($('title').text()).toEqual('Accessibility statement - Official Visits - DPS')
        expect($('h1').text().trim()).toEqual('Accessibility statement')
        expect($('.govuk-back-link.js-back-link')).toHaveLength(1)
        expect($('h2')).toHaveLength(5)
        expect(auditService.logPageView).toHaveBeenCalledWith(Page.ACCESSIBILITY_STATEMENT_PAGE, {
          who: user.username,
          correlationId: expect.any(String),
        })
      })
  })
})
