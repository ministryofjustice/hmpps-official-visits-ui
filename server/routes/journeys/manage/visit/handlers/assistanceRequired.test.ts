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
import { expectErrorMessages, expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'
import { VisitType } from '../../../../../@types/officialVisitsApi/types'
import config from '../../../../../config'
import TelemetryService from '../../../../../services/telemetryService'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const telemetryService = new TelemetryService(null) as jest.Mocked<TelemetryService>

let app: Express
const defaultJourneySession = () => ({
  officialVisit: {
    prisoner: mockPrisoner,
    visitType: 'IN_PERSON',
    prisonCode: 'MDI',
    officialVisitors: [
      {
        firstName: 'John',
        lastName: 'Dasolicitor',
        relationshipToPrisonerDescription: 'Solicitor',
        prisonerContactId: 111,
      },

      {
        firstName: 'Johnny',
        lastName: 'Dasolicitor',
        relationshipToPrisonerDescription: 'Solicitor',
        prisonerContactId: 112,
      },
      {
        firstName: 'Jon',
        lastName: 'Dasolicitor',
        relationshipToPrisonerDescription: 'Solicitor',
        prisonerContactId: 113,
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
  config.featureToggles.allowSocialVisitorsPrisons = 'MDI'
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService, telemetryService },
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

          expect(getArrayItemPropById($, 'assistanceRequired', 0, 'id').val()).toEqual('111')
          expect(getArrayItemPropById($, 'assistanceRequired', 1, 'id').val()).toEqual('112')
          expect(getArrayItemPropById($, 'assistanceRequired', 2, 'id').val()).toEqual('113')
          expect(getArrayItemPropById($, 'assistanceRequired', 3, 'id').val()).toEqual('222')

          expect(getArrayItemPropById($, 'assistanceRequired', 0, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 1, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 2, 'id').attr('checked')).toBeFalsy()
          expect(getArrayItemPropById($, 'assistanceRequired', 3, 'id').attr('checked')).toBeFalsy()

          expect($('.govuk-label[for="assistanceRequired\\[0\\]\\[notes\\]"]').text()).toContain(
            'Add any additional information (optional)',
          )
          expect($('.govuk-label[for="assistanceRequired\\[1\\]\\[notes\\]"]').text()).toContain(
            'Add any additional information (optional)',
          )
          expect($('.govuk-label[for="assistanceRequired\\[2\\]\\[notes\\]"]').text()).toContain(
            'Add any additional information (optional)',
          )
          expect($('.govuk-label[for="assistanceRequired\\[3\\]\\[notes\\]"]').text()).toContain(
            'Add any additional information (optional)',
          )

          expect($('.govuk-checkboxes__label').eq(0).text()).toContain('John Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(1).text()).toContain('Johnny Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(2).text()).toContain('Jon Dasolicitor (Solicitor)')
          expect($('.govuk-checkboxes__label').eq(3).text()).toContain('Jane Dafriend (Friend)')
          expect($('.govuk-back-link').attr('href')).toEqual('select-social-visitors')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.ASSISTANCE_REQUIRED_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should go back to official visitors page when social visitors is disabled for the prison', () => {
      config.featureToggles.allowSocialVisitorsPrisons = ''
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('Will visitors need assistance during their visit? (optional)')
          expect($('.govuk-back-link').attr('href')).toEqual('select-official-visitors')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.ASSISTANCE_REQUIRED_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should disallow submission if notes are too long', () => {
      return request(app)
        .post(URL)
        .send({
          assistanceRequired: [
            { id: '111', notes: 'a'.repeat(241) },
            { id: '112', notes: 'a'.repeat(241) },
            { id: '113', notes: 'a'.repeat(241) },
            { id: '222', notes: 'a'.repeat(241) },
          ],
        })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'assistanceRequired[0][notes]',
              href: '#assistanceRequired[0][notes]',
              text: 'Information about assistance must be 240 characters or less',
            },
            {
              fieldId: 'assistanceRequired[1][notes]',
              href: '#assistanceRequired[1][notes]',
              text: 'Information about assistance must be 240 characters or less',
            },
            {
              fieldId: 'assistanceRequired[2][notes]',
              href: '#assistanceRequired[2][notes]',
              text: 'Information about assistance must be 240 characters or less',
            },
            {
              fieldId: 'assistanceRequired[3][notes]',
              href: '#assistanceRequired[3][notes]',
              text: 'Information about assistance must be 240 characters or less',
            },
          ]),
        )
    })

    it('should allow empty submission and redirect to equipment page when visit type is IN_PERSON', () => {
      return request(app)
        .post(URL)
        .send({
          assistanceRequired: [
            { id: '111', notes: '' },
            { id: '112', notes: '' },
            { id: '113', notes: '' },
            { id: '222', notes: '' },
          ],
        })
        .expect(302)
        .expect('location', 'equipment')
        .expect(() => expectNoErrorMessages())
    })

    it('should allow empty submission and redirect to comments when visit type is not IN_PERSON', () => {
      const journey = defaultJourneySession()
      journey.officialVisit.visitType = 'SOCIAL' as VisitType
      appSetup(journey)

      return request(app)
        .post(URL)
        .send({
          assistanceRequired: [
            { id: '111', notes: '' },
            { id: '112', notes: '' },
            { id: '113', notes: '' },
            { id: '222', notes: '' },
          ],
        })
        .expect(302)
        .expect('location', 'comments')
        .expect(() => expectNoErrorMessages())
    })

    it('should accept a form submission', async () => {
      await request(app)
        .post(URL)
        .send({
          assistanceRequired: [
            // Assisted visit with note
            { id: '111', selected: 'true', notes: 'flag is true and here is a note' },
            // Not assisted visit but note is present
            { id: '112', notes: 'flag is false but note is still recorded' },
            // Assisted visit with no note
            { id: '113', selected: 'true', notes: '' },
            // Not assisted visit with no note
            { id: '222', notes: '' },
          ],
        })
        .expect(302)
        .expect('location', 'equipment')
        .expect(() => expectNoErrorMessages())

      const journeySession = (await getJourneySession(app, 'officialVisit')) as OfficialVisitJourney
      expect(journeySession.officialVisitors[0].assistanceNotes).toEqual('flag is true and here is a note')
      expect(journeySession.officialVisitors[0].assistedVisit).toEqual(true)
      expect(journeySession.officialVisitors[1].assistanceNotes).toEqual('flag is false but note is still recorded')
      expect(journeySession.officialVisitors[1].assistedVisit).toEqual(false)
      expect(journeySession.officialVisitors[2].assistanceNotes).toEqual(undefined)
      expect(journeySession.officialVisitors[2].assistedVisit).toEqual(true)
      expect(journeySession.socialVisitors[0].assistanceNotes).toEqual(undefined)
      expect(journeySession.socialVisitors[0].assistedVisit).toEqual(false)
    })
  })
})
