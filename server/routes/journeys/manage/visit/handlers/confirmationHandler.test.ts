import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getPageHeader, getTextById } from '../../../../testutils/cheerio'
import { prisoner } from '../../../../../testutils/mocks'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'
import { OfficialVisit } from '../../../../../@types/officialVisitsApi/types'
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
    prisoner,
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
  officialVisitsService.getOfficialVisitById.mockResolvedValue({
    officialVisitId: 1,
    prisonCode: 'AAA',
    prisonDescription: 'Example Prison',
    visitStatus: 'SCHEDULED',
    visitStatusDescription: 'Scheduled',
    visitTypeCode: 'VIDEO',
    visitTypeDescription: 'Video',
    visitDate: '2025-12-04',
    startTime: '09:00:00',
    endTime: '10:00:00',
    dpsLocationId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    locationDescription: 'Example Prison',
    visitSlotId: 1,
    staffNotes: null,
    prisonerNotes: null,
    visitorConcernNotes: null,
    completionCode: null,
    completionDescription: 'null',
    searchTypeCode: 'RUB_A',
    searchTypeDescription: 'Rubdown level A',
    createdTime: '2025-12-04T10:39:59.448838',
    createdBy: 'TIM',
    updatedTime: null,
    updatedBy: null,
    officialVisitors: [
      {
        visitorTypeCode: 'CONTACT',
        visitorTypeDescription: 'Contact',
        firstName: 'Adam',
        lastName: 'Adams',
        contactId: 20085662,
        prisonerContactId: 7331628,
        relationshipTypeCode: 'OFFICIAL',
        relationshipTypeDescription: 'Official',
        relationshipCode: 'CUSP',
        leadVisitor: true,
        assistedVisit: false,
        visitorNotes: null,
        attendanceCode: null,
        attendanceDescription: 'null',
        createdBy: 'TIM',
        createdTime: '2025-12-04T10:39:59.448838',
        updatedBy: null,
        updatedTime: null,
        offenderVisitVisitorId: null,
      },
    ],
    prisonerVisited: {
      prisonerNumber: 'A1111AA',
      prisonCode: 'AAA',
      firstName: 'JOHN',
      lastName: 'DOE',
      dateOfBirth: '1986-06-27',
      cellLocation: '2-1-007',
      middleNames: 'JOHNSON',
      offenderBookId: null,
      attendanceCode: 'null',
      attendanceCodeDescription: 'null',
    },
  } as OfficialVisit)
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
          expect($('.govuk-list--bullet > li').text()).toEqual('Adam Adams (Contact)')
          expect($('.govuk-panel__body').text().trim()).toEqual('Prisoner: John Doe (A1111AA)')
          expect(getTextById($, 'visit-details')).toEqual(
            'The visit will take place on Thursday, 4 December 2025 from 9am to 10am (1 hour) in Example Prison.',
          )

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.CONFIRM_VISIT_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })
})
