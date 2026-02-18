import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import { getPageHeader, getProgressTrackerCompleted, getProgressTrackerItems } from '../../../../testutils/cheerio'
import { mockPrisoner } from '../../../../../testutils/mocks'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'
import config from '../../../../../config'

jest.mock('../../../../../services/auditService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express
const defaultJourneySession = () => ({
  officialVisit: {
    prisoner: mockPrisoner,
    visitType: 'IN_PERSON',
    prisonCode: 'MDI',
    officialVisitors: [],
    socialVisitors: [],
  } as Partial<OfficialVisitJourney>,
})

const appSetup = (journeySession = defaultJourneySession()) => {
  config.featureToggles.allowSocialVisitorsPrisons = 'MDI'
  app = appWithAllRoutes({
    services: { auditService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
  appSetup()
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/cancellation-check?stepsChecked=1`

describe('Cancellation check handler', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)
          expect(heading).toEqual('Are you sure you want to cancel and delete this official visit?')

          expect(getProgressTrackerCompleted($)).toHaveLength(1)
          expect(getProgressTrackerItems($)).toHaveLength(5)

          expect($('.govuk-button').eq(0).attr('href')).toEqual('/')
          expect($('.govuk-button').eq(1).attr('href')).toEqual('check-your-answers')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.CHECK_CANCEL_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })
})
