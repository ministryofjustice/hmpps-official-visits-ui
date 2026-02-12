import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getPageHeader, getTextById } from '../../../../testutils/cheerio'
import { mockPrisoner, mockVisitByIdVisit } from '../../../../../testutils/mocks'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'
import { Prisoner } from '../../../../../@types/prisonerSearchApi/types'

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

const appSetup = (journeySession = defaultJourneySession()) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
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
          expect($('.govuk-list--bullet > li').text()).toEqual('Peter Malicious (Solicitor)')
          expect($('.govuk-panel__body').text().trim()).toEqual('Prisoner: John Doe (A1111AA)')
          expect(getTextById($, 'visit-details')).toEqual(
            'The visit will take place on Thursday, 1 January 2026 from 10am to 11am (1 hour) in First Location.',
          )

          expect($('a[href="/view/visit/1"]').text()).toEqual('View visit')
          expect($('a[href="/manage/create/search"]').text()).toEqual('Schedule another visit')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.CONFIRM_VISIT_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })
})
