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
        prisonerContactId: 111,
      },
    ],
    socialVisitors: [
      {
        firstName: 'Jane',
        lastName: 'Dafriend',
        relationshipToPrisonerDescription: 'Friend',
        prisonerContactId: 222,
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

const URL = `/manage/create/${journeyId()}/equipment`

describe('Equipment handler', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('Will visitors have equipment with them? (optional)')

          expect(getArrayItemPropById($, 'equipment', 0, 'id').val()).toEqual('222')
          expect(getArrayItemPropById($, 'equipment', 1, 'id').val()).toEqual('111')

          expect(getArrayItemPropById($, 'equipment', 0, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'equipment', 1, 'id').attr('checked')).toBeFalsy()

          expect($('.govuk-checkboxes__label').eq(0).text()).toContain('Jane Dafriend (Friend)')
          expect($('.govuk-checkboxes__label').eq(1).text()).toContain('John Dasolicitor (Solicitor)')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.EQUIPMENT_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should allow empty submission', () => {
      return request(app)
        .post(URL)
        .send({ equipment: [{ notes: '' }] })
        .expect(302)
        .expect('location', 'check-your-answers')
        .expect(() => expectNoErrorMessages())
    })

    it('should error when no description is given for a contact with equipment', () => {
      return request(app)
        .post(URL)
        .send({ equipment: [{ id: '111', notes: '' }] })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'equipment[0][notes]',
              href: '#equipment[0][notes]',
              text: 'Enter information about equipment for this visitor',
            },
          ]),
        )
    })

    it('should accept a form submission', async () => {
      await request(app)
        .post(URL)
        .send({ equipment: [{ id: '111', notes: 'note' }] })
        .expect(302)
        .expect('location', 'check-your-answers')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors[0].equipmentNotes).toEqual('note')
    })
  })
})
