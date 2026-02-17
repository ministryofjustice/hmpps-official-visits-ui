import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getPageHeader } from '../../../../testutils/cheerio'
import { expectErrorMessages, expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
import expectJourneySession from '../../../../testutils/testUtilRoute'
import TelemetryService from '../../../../../services/telemetryService'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const telemetryService = new TelemetryService(null) as jest.Mocked<TelemetryService>

let app: Express

const appSetup = (journeySession = { officialVisit: {} }) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService, telemetryService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession,
  })
}

beforeEach(() => {
  appSetup()
  officialVisitsService.getReferenceData.mockResolvedValue([{ code: 'PHONE', description: 'Phone' }])
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/visit-type`

describe('Visit type handler', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('What type of official visit?')
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.VISIT_TYPE_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should error on an empty submission', () => {
      return request(app)
        .post(URL)
        .send({ visitType: '' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'visitType',
              href: '#visitType',
              text: 'Select a type of official visit',
            },
          ]),
        )
    })

    it('should error on an invalid official visit type', () => {
      return request(app)
        .post(URL)
        .send({ visitType: 'NaN' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'visitType',
              href: '#visitType',
              text: 'Select a type of official visit',
            },
          ]),
        )
    })

    it('should accept a valid official visit type', () => {
      return request(app)
        .post(URL)
        .send({ visitType: 'PHONE' })
        .expect(302)
        .expect('location', 'time-slot')
        .expect(() => expectNoErrorMessages())
        .then(() =>
          expectJourneySession(app, 'officialVisit', {
            visitType: 'PHONE',
            visitTypeDescription: 'Phone',
          }),
        )
    })
  })
})
