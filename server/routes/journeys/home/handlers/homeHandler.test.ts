import type { Express } from 'express'
import request from 'supertest'
import cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { getByDataQa, getPageHeader } from '../../../testutils/cheerio'
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
        const $ = cheerio.load(res.text)
        const heading = getPageHeader($)
        expect(heading).toContain('Official Visits')

        // Check card contents individually
        const bookVisitCard = getByDataQa($, 'book-official-visit-card')
        expect(bookVisitCard.find('.card__link').text()).toContain('Book an official visit')

        const viewSlotsCard = getByDataQa($, 'view-official-visit-slots-card')
        expect(viewSlotsCard.find('.card__link').text()).toContain('View available slots for official visits')

        const viewOrCancelVisitCard = getByDataQa($, 'view-or-cancel-official-visits-card')
        expect(viewOrCancelVisitCard.find('.card__link').text()).toContain('View or cancel existing official visits')

        const manageTimeSlotsCard = getByDataQa($, 'manage-time-slots-card')
        expect(manageTimeSlotsCard.find('.card__link').text()).toContain(
          'Administer days, slots and locations for official visits',
        )

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
        const heading = getPageHeader($)

        expect(heading).toContain('Sorry, scheduled maintenance affects this service')
      })
  })
})
