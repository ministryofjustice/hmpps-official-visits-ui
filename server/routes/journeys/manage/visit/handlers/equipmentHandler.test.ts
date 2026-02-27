import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getArrayItemPropById, getPageHeader } from '../../../../testutils/cheerio'
import { getJourneySession } from '../../../../testutils/testUtilRoute'
import { mockSchedule, mockTimeslots, mockPrisoner } from '../../../../../testutils/mocks'
import {
  expectErrorMessages,
  expectFlashMessage,
  expectNoErrorMessages,
} from '../../../../testutils/expectErrorMessage'
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
  describe('GET (create)', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)
          expect($('.govuk-hint').eq(0).text()).toEqual('Schedule an official visit')
          expect(heading).toEqual('Will visitors have equipment with them? (optional)')

          expect(getArrayItemPropById($, 'equipment', 0, 'id').val()).toEqual('111')
          expect(getArrayItemPropById($, 'equipment', 1, 'id').val()).toEqual('222')

          expect(getArrayItemPropById($, 'equipment', 0, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'equipment', 1, 'id').attr('checked')).toBeFalsy()

          expect($('.govuk-label[for="equipment\\[0\\]\\[notes\\]"]').text()).toContain(
            'Add information about their equipment',
          )
          expect($('.govuk-label[for="equipment\\[1\\]\\[notes\\]"]').text()).toContain(
            'Add information about their equipment',
          )

          expect($('.govuk-checkboxes__label').eq(0).text()).toContain('John Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(1).text()).toContain('Jane Dafriend (Friend)')

          expect($('.govuk-back-link').attr('href')).toEqual(`assistance-required`)
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to homepage')
          expect($('.govuk-link').last().attr('href')).toContain(`cancellation-check?stepsChecked=3`)

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.EQUIPMENT_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('GET (amend)', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(`/manage/amend/1/${journeyId()}/equipment?change=true`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect($('.govuk-hint').eq(0).text()).toEqual('Amend an official visit')
          expect(heading).toEqual('Will visitors have equipment with them? (optional)')

          expect(getArrayItemPropById($, 'equipment', 0, 'id').val()).toEqual('111')
          expect(getArrayItemPropById($, 'equipment', 1, 'id').val()).toEqual('222')

          expect(getArrayItemPropById($, 'equipment', 0, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'equipment', 1, 'id').attr('checked')).toBeFalsy()

          expect($('.govuk-label[for="equipment\\[0\\]\\[notes\\]"]').text()).toContain(
            'Add information about their equipment',
          )
          expect($('.govuk-label[for="equipment\\[1\\]\\[notes\\]"]').text()).toContain(
            'Add information about their equipment',
          )

          expect($('.govuk-checkboxes__label').eq(0).text()).toContain('John Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(1).text()).toContain('Jane Dafriend (Friend)')

          expect($('.govuk-back-link').attr('href')).toEqual(`./`)
          expect($('.govuk-button').text()).toContain('Submit')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to visit details')
          expect($('.govuk-link').last().attr('href')).toContain(`./`)

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
        .expect('location', 'comments')
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
        .expect('location', 'comments')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors[0].equipmentNotes).toEqual('note')
    })

    it('should accept a form submission (amend)', async () => {
      await request(app)
        .post(`/manage/amend/1/${journeyId()}/equipment`)
        .send({ equipment: [{ id: '111', notes: 'note' }] })
        .expect(302)
        .expect('location', `/manage/amend/1/${journeyId()}`)
        .expect(() => expectFlashMessage('updateVerb', 'amended'))

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors[0].equipmentNotes).toEqual('note')
    })
  })
})
