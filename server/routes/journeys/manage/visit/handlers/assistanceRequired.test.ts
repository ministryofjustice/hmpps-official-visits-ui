import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getArrayItemPropById, getPageHeader } from '../../../../testutils/cheerio'
import { getJourneySession } from '../../../../testutils/testUtilRoute'
import { mockSchedule, mockTimeslots, prisoner } from '../../../../../testutils/mocks'
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
    prisoner,
    visitType: 'IN_PERSON',
    officialVisitors: [
      {
        firstName: 'John',
        lastName: 'Dasolicitor',
        relationshipToPrisonerDescription: 'Solicitor',
        contactId: 111,
      },
    ],
    socialVisitors: [
      {
        firstName: 'Jane',
        lastName: 'Dafriend',
        relationshipToPrisonerDescription: 'Friend',
        contactId: 222,
      },
    ],
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
  officialVisitsService.getAvailableSlots.mockResolvedValue(mockTimeslots)

  officialVisitsService.getSchedule.mockResolvedValue(mockSchedule)
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/assistance-required`

describe('Assistance required handler', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('Will visitors need assistance during their visit? (optional)')

          expect(getArrayItemPropById($, 'assistanceRequired', 0, 'id').val()).toEqual('222')
          expect(getArrayItemPropById($, 'assistanceRequired', 1, 'id').val()).toEqual('111')

          expect(getArrayItemPropById($, 'assistanceRequired', 0, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 1, 'id').attr('checked')).toBeFalsy()

          expect($('.govuk-checkboxes__label').eq(0).text()).toContain('Jane Dafriend (Friend)')
          expect($('.govuk-checkboxes__label').eq(1).text()).toContain('John Dasolicitor (Solicitor)')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.ASSISTANCE_REQUIRED_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should allow empty submission and redirect to equipment page when visit type is IN_PERSON', () => {
      return request(app)
        .post(URL)
        .send({ assistanceRequired: [{ notes: '' }] })
        .expect(302)
        .expect('location', 'equipment')
        .expect(() => expectNoErrorMessages())
    })

    it('should allow empty submission and redirect to cya when visit type is not IN_PERSON', () => {
      const journey = defaultJourneySession()
      journey.officialVisit.visitType = 'SOCIAL'
      appSetup(journey)

      return request(app)
        .post(URL)
        .send({ assistanceRequired: [{ notes: '' }] })
        .expect(302)
        .expect('location', 'check-your-answers')
        .expect(() => expectNoErrorMessages())
    })

    it('should error when no description is given for a contact requiring assistance', () => {
      return request(app)
        .post(URL)
        .send({ assistanceRequired: [{ id: '111', notes: '' }] })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'assistanceRequired[0][notes]',
              href: '#assistanceRequired[0][notes]',
              text: 'Enter information about assistance for this visitor',
            },
          ]),
        )
    })

    it('should accept a form submission', async () => {
      await request(app)
        .post(URL)
        .send({ assistanceRequired: [{ id: '111', notes: 'note' }] })
        .expect(302)
        .expect('location', 'equipment')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors[0].assistanceNotes).toEqual('note')
    })
  })
})
