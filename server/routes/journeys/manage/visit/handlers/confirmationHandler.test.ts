import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getPageHeader } from '../../../../testutils/cheerio'
import { mockPrisoner, mockVisitByIdVisit } from '../../../../../testutils/mocks'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'
import { Prisoner } from '../../../../../@types/prisonerSearchApi/types'
import config from '../../../../../config'
import { AuthorisedRoles } from '../../../../../middleware/populateUserPermissions'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express
const defaultJourneySession = () => ({
  officialVisit: {
    prisoner: mockPrisoner,
    prisonerNotes: 'Some previously entered notes',
  } as Partial<OfficialVisitJourney>,
})

const appSetup = (
  userRoles: AuthorisedRoles[] = [AuthorisedRoles.MANAGE, AuthorisedRoles.CONTACTS_AUTHORISER, AuthorisedRoles.ADMIN],
  journeySession = defaultJourneySession(),
) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
    userSupplier: () => ({ ...user, userRoles }),
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
  config.featureToggles.emailNotificationsEnabled = false
  appSetup()
  prisonerService.getPrisonerByPrisonerNumber.mockResolvedValue({
    firstName: 'John',
    lastName: 'Doe',
    prisonerNumber: 'A1111AA',
  } as unknown as Prisoner)
  officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/confirmation/1`

describe('confirmation handler', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('New official visit booked')
          expect($('.govuk-panel__body').text().trim()).toEqual('Prisoner: John Doe (A1111AA)')
          expect($('#confirmation-message').text().trim()).toEqual(
            'You have successfully booked an official visit at Moorland (HMP & YOI) with John Doe (A1111AA)',
          )

          // Visit details are shown as a summary list table
          const detailsKeys = $('[data-qa="visit-details"] .govuk-summary-list__key')
            .map((_, el) => $(el).text().trim())
            .get()
          const detailsValues = $('[data-qa="visit-details"] .govuk-summary-list__value')
            .map((_, el) => $(el).text().trim())
            .get()
          expect(detailsKeys).toEqual(['Visitor name', 'Date', 'Time', 'Location'])
          expect(detailsValues).toEqual([
            'Peter Malicious (Solicitor)',
            'Thursday 1 January 2026',
            '10:00 to 11:00 (1 hour)',
            'First Location',
          ])

          expect($('a[href="/view/visit/1"]').text()).toEqual('View visit')
          expect($('a[href="/manage/create/search"]').text()).toEqual('Schedule another visit')
          expect($('a[href="/view/visit/1/movement-slip"]').text()).toEqual('Print a movement slip')
          expect($('a[href="/notification/enter-email-address/1/create"]').length).toEqual(0)

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.CONFIRM_VISIT_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should render send email confirmation link when email notifications are enabled and user has manage role', () => {
      config.featureToggles.emailNotificationsEnabled = true
      appSetup()

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          const $sendEmail = $('a[href="/notification/enter-email-address/1/create"]')
          expect($sendEmail.text()).toEqual('Send email confirmation')
          expect($sendEmail.attr('target')).toBeUndefined()
        })
    })

    it('should not render send email confirmation link when email notifications are enabled and user does not have manage role', () => {
      config.featureToggles.emailNotificationsEnabled = true
      appSetup([AuthorisedRoles.VIEW])

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('a[href="/notification/enter-email-address/1/create"]').text()).not.toContain(
            'Send email confirmation',
          )
        })
    })
  })
})
