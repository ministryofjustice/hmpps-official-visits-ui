import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getPageHeader, getTextById } from '../../../../testutils/cheerio'
import { getJourneySession } from '../../../../testutils/testUtilRoute'
import { mockPrisoner } from '../../../../../testutils/mocks'
import { expectErrorMessages, expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'

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
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/comments`

describe('comments handler', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('Add extra information (optional)')
          expect(getTextById($, 'comments')).toEqual('Some previously entered notes')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.COMMENTS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should allow empty submissions', () => {
      return request(app)
        .post(URL)
        .send({})
        .expect(302)
        .expect('location', 'check-your-answers')
        .expect(() => expectNoErrorMessages())
    })

    it('should disallow comments over 400 characters', () => {
      return request(app)
        .post(URL)
        .send({ comments: 'a'.repeat(401) })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'comments',
              href: '#comments',
              text: 'Extra information must be 400 characters or less',
            },
          ]),
        )
    })

    it('should accept a form submission', async () => {
      await request(app)
        .post(URL)
        .send({ comments: 'comment' })
        .expect(302)
        .expect('location', 'check-your-answers')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.prisonerNotes).toEqual('comment')
    })
  })
})
