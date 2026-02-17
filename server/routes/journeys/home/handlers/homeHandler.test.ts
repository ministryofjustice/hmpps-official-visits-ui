import type { Express } from 'express'
import request from 'supertest'
import cheerio from 'cheerio'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { getByDataQa, getPageHeader } from '../../../testutils/cheerio'
import AuditService, { Page } from '../../../../services/auditService'
import config from '../../../../config'
import { AuthorisedRoles } from '../../../../middleware/populateUserPermissions'
import TelemetryService from '../../../../services/telemetryService'

jest.mock('../../../../services/auditService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const telemetryService = new TelemetryService(null) as jest.Mocked<TelemetryService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({
    services: { auditService, telemetryService },
    userSupplier: () => user,
  })
  config.maintenanceMode = false
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /home', () => {
  it.each([
    [AuthorisedRoles.DEFAULT, ['view-list']],
    [AuthorisedRoles.VIEW, ['view-list']],
    [AuthorisedRoles.MANAGE, ['view-list', 'create']],
    [AuthorisedRoles.ADMIN, ['view-list', 'admin']],
  ])(`should render home page - %s (%s) view`, (role, visibleCards) => {
    auditService.logPageView.mockResolvedValue(null)
    app = appWithAllRoutes({
      services: { auditService },
      userSupplier: () => ({ ...user, userRoles: [role] }),
    })
    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(res => {
        const $ = cheerio.load(res.text)
        const heading = getPageHeader($)
        expect(heading).toContain('Official Visits')

        const bookVisitCard = getByDataQa($, 'book-official-visit-card')
        const viewOrCancelVisitCard = getByDataQa($, 'view-or-cancel-official-visits-card')
        const manageTimeSlotsCard = getByDataQa($, 'manage-time-slots-card')

        // Check card contents individually
        if (visibleCards.includes('create')) {
          expect(bookVisitCard.find('.card__link').text()).toContain('Book an official visit')
        } else {
          expect(bookVisitCard.find('.card__link').text()).toBe('')
        }

        if (visibleCards.includes('view-list')) {
          expect(viewOrCancelVisitCard.find('.card__link').text()).toContain('View or cancel existing official visits')
        } else {
          expect(viewOrCancelVisitCard.find('.card__link').text()).toBe('')
        }

        if (visibleCards.includes('admin')) {
          expect(manageTimeSlotsCard.find('.card__link').text()).toContain(
            'Administer days, slots and locations for official visits',
          )
        } else {
          expect(manageTimeSlotsCard.find('.card__link').text()).toBe('')
        }

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
