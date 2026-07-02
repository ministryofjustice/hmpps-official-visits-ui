import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getArrayItemPropById, getPageHeader } from '../../../../testutils/cheerio'
import { getJourneySession } from '../../../../testutils/testUtilRoute'
import { mockSchedule, mockPrisoner } from '../../../../../testutils/mocks'
import { expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'
import config from '../../../../../config'

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
    prisonCode: 'MDI',
    selectedTimeSlot: {
      timeSlotId: 1,
      visitSlotId: 1,
      visitDate: '2026-01-26',
      startTime: '13:30',
      endTime: '16:00',
      availableVideoSessions: 2,
      availableAdults: 10, // Increased to avoid capacity issues
      availableGroups: 2,
    },
    officialVisitors: [
      {
        firstName: 'John',
        lastName: 'Dasolicitor',
        relationshipToPrisonerDescription: 'Solicitor',
        relationshipToPrisonerCode: 'SOL',
        contactId: 111,
        officialVisitorId: 1,
        assistedVisit: false,
        leadVisitor: true,
      },
      {
        firstName: 'Johnny',
        lastName: 'Dasolicitor',
        relationshipToPrisonerDescription: 'Solicitor',
        relationshipToPrisonerCode: 'SOL',
        contactId: 112,
        officialVisitorId: 2,
        assistedVisit: false,
        leadVisitor: false,
      },
      {
        firstName: 'Jon',
        lastName: 'Dasolicitor',
        relationshipToPrisonerDescription: 'Solicitor',
        relationshipToPrisonerCode: 'SOL',
        contactId: 113,
        officialVisitorId: 3,
        assistedVisit: false,
        leadVisitor: false,
      },
    ],
    socialVisitors: [
      {
        firstName: 'Jane',
        lastName: 'Dafriend',
        relationshipToPrisonerDescription: 'Friend',
        relationshipToPrisonerCode: 'FRI',
        contactId: 222,
        officialVisitorId: 4,
        assistedVisit: false,
        leadVisitor: false,
      },
    ],
  } as Partial<OfficialVisitJourney>,
})

const appSetup = (journeySession = defaultJourneySession()) => {
  config.featureToggles.allowSocialVisitorsPrisons = 'MDI'
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
  appSetup()
  officialVisitsService.getAvailableSlots.mockResolvedValue([
    {
      timeSlotId: 1,
      visitSlotId: 1,
      prisonCode: 'MDI',
      dayCode: 'MON',
      dayDescription: 'Monday',
      visitDate: '2026-01-26',
      startTime: '13:30',
      endTime: '16:00',
      dpsLocationId: 'loc1',
      availableVideoSessions: 2,
      availableAdults: 3,
      availableGroups: 2,
    },
  ])
  officialVisitsService.getSchedule.mockResolvedValue(mockSchedule)
  officialVisitsService.checkForOverlappingVisits.mockResolvedValue({
    prisonerNumber: 'G4793VF',
    overlappingPrisonerVisits: [],
    contacts: [],
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/assistance-required`

describe('Assistance required handler', () => {
  describe('GET (create)', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)
          expect($('.govuk-hint').eq(0).text()).toEqual('Book an official visit')
          expect(heading).toEqual('Do any visitors need assistance? (optional)')

          expect(getArrayItemPropById($, 'assistanceRequired', 0, 'id').val()).toEqual('111')
          expect(getArrayItemPropById($, 'assistanceRequired', 1, 'id').val()).toEqual('112')
          expect(getArrayItemPropById($, 'assistanceRequired', 2, 'id').val()).toEqual('113')
          expect(getArrayItemPropById($, 'assistanceRequired', 3, 'id').val()).toEqual('222')

          expect(getArrayItemPropById($, 'assistanceRequired', 0, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 1, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 2, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 3, 'id').attr('checked')).toBeFalsy()

          expect($('.govuk-label[for="assistanceRequired\\[0\\]\\[notes\\]"]')).toHaveLength(0)
          expect($('.govuk-label[for="assistanceRequired\\[1\\]\\[notes\\]"]')).toHaveLength(0)
          expect($('.govuk-label[for="assistanceRequired\\[2\\]\\[notes\\]"]')).toHaveLength(0)
          expect($('.govuk-label[for="assistanceRequired\\[3\\]\\[notes\\]"]')).toHaveLength(0)

          expect($('.govuk-checkboxes__label').eq(0).text()).toContain('John Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(1).text()).toContain('Johnny Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(2).text()).toContain('Jon Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(3).text()).toContain('Jane Dafriend (Friend)')

          expect($('.govuk-back-link').attr('href')).toEqual(`select-social-visitors`)
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to homepage')
          expect($('.govuk-link').last().attr('href')).toContain(`cancellation-check?stepsChecked=3`)

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.ASSISTANCE_REQUIRED_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should go back to social visitors page when social visitors exist in journey data even if disabled for prison', () => {
      config.featureToggles.allowSocialVisitorsPrisons = ''
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('Do any visitors need assistance? (optional)')
          expect($('.govuk-back-link').attr('href')).toEqual('select-social-visitors')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.ASSISTANCE_REQUIRED_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('GET (amend)', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(`/manage/amend/1/${journeyId()}/assistance-required?change=true`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)
          expect($('.govuk-hint').eq(0).text()).toEqual('Amend an official visit')
          expect(heading).toEqual('Do any visitors need assistance? (optional)')

          expect(getArrayItemPropById($, 'assistanceRequired', 0, 'id').val()).toEqual('111')
          expect(getArrayItemPropById($, 'assistanceRequired', 1, 'id').val()).toEqual('112')
          expect(getArrayItemPropById($, 'assistanceRequired', 2, 'id').val()).toEqual('113')
          expect(getArrayItemPropById($, 'assistanceRequired', 3, 'id').val()).toEqual('222')

          expect(getArrayItemPropById($, 'assistanceRequired', 0, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 1, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 2, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 3, 'id').attr('checked')).toBeFalsy()

          expect($('.govuk-label[for="assistanceRequired\\[0\\]\\[notes\\]"]')).toHaveLength(0)
          expect($('.govuk-label[for="assistanceRequired\\[1\\]\\[notes\\]"]')).toHaveLength(0)
          expect($('.govuk-label[for="assistanceRequired\\[2\\]\\[notes\\]"]')).toHaveLength(0)
          expect($('.govuk-label[for="assistanceRequired\\[3\\]\\[notes\\]"]')).toHaveLength(0)

          expect($('.govuk-checkboxes__label').eq(0).text()).toContain('John Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(1).text()).toContain('Johnny Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(2).text()).toContain('Jon Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(3).text()).toContain('Jane Dafriend (Friend)')

          expect($('.govuk-back-link').attr('href')).toEqual(`./`)
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to visit details')
          expect($('.govuk-link').last().attr('href')).toContain(`./`)

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.ASSISTANCE_REQUIRED_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should go back to social visitors page when social visitors exist in journey data even if disabled for prison', () => {
      config.featureToggles.allowSocialVisitorsPrisons = ''
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('Do any visitors need assistance? (optional)')
          expect($('.govuk-back-link').attr('href')).toEqual('select-social-visitors')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.ASSISTANCE_REQUIRED_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should record the assistance selections and redirect to the details page', async () => {
      await request(app)
        .post(URL)
        .send({
          assistanceRequired: [
            { id: '111', selected: 'true' },
            { id: '112' },
            { id: '113', selected: 'true' },
            { id: '222' },
          ],
        })
        .expect(302)
        .expect('location', 'visitor-details')
        .expect(() => expectNoErrorMessages())

      const journeySession = (await getJourneySession(app, 'officialVisit')) as OfficialVisitJourney
      expect(journeySession.officialVisitors[0].assistedVisit).toEqual(true)
      expect(journeySession.officialVisitors[1].assistedVisit).toEqual(false)
      expect(journeySession.officialVisitors[2].assistedVisit).toEqual(true)
      expect(journeySession.socialVisitors[0].assistedVisit).toEqual(false)
    })

    it('should redirect to the details page even when no visitor needs assistance', () => {
      return request(app)
        .post(URL)
        .send({
          assistanceRequired: [{ id: '111' }, { id: '112' }, { id: '113' }, { id: '222' }],
        })
        .expect(302)
        .expect('location', 'visitor-details')
        .expect(() => expectNoErrorMessages())
    })

    it('should not save but redirect to the details page in amend mode', async () => {
      const amendJourneySession = () => ({
        ...defaultJourneySession(),
        amendVisit: {
          changePage: 'assistance-required',
        },
      })

      appSetup(amendJourneySession())

      await request(app)
        .post(`/manage/amend/1/${journeyId()}/assistance-required?change=true`)
        .send({
          assistanceRequired: [{ id: '111', selected: 'true' }, { id: '112' }, { id: '113' }, { id: '222' }],
        })
        .expect(302)
        .expect('location', 'visitor-details')

      expect(officialVisitsService.updateVisitors).not.toHaveBeenCalled()
    })
  })
})
