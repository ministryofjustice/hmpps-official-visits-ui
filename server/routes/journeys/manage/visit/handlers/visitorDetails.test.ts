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
import { VisitType } from '../../../../../@types/officialVisitsApi/types'

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
    officialVisitors: [
      {
        firstName: 'John',
        lastName: 'Dasolicitor',
        relationshipToPrisonerDescription: 'Solicitor',
        relationshipToPrisonerCode: 'SOL',
        contactId: 111,
        officialVisitorId: 1,
        assistedVisit: true,
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
    ],
    socialVisitors: [
      {
        firstName: 'Jane',
        lastName: 'Dafriend',
        relationshipToPrisonerDescription: 'Friend',
        relationshipToPrisonerCode: 'FRI',
        contactId: 222,
        officialVisitorId: 3,
        assistedVisit: true,
        leadVisitor: false,
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

const URL = `/manage/create/${journeyId()}/visitor-details`

describe('Visitor details handler', () => {
  describe('GET (create)', () => {
    it('should render a text box for every visitor regardless of whether they need assistance', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)
          expect($('.govuk-hint').eq(0).text()).toEqual('Book an official visit')
          expect(heading).toEqual('Further visitor details (optional)')

          // All visitor note fields sit in a single fieldset whose legend is the page heading
          const $fieldsets = $('fieldset.govuk-fieldset')
          expect($fieldsets).toHaveLength(1)
          expect($fieldsets.find('legend h1').text().trim()).toEqual('Further visitor details (optional)')
          expect($fieldsets.find('textarea').length).toEqual(3)

          // All visitors are listed, including Johnny who does not need assistance
          expect(getArrayItemPropById($, 'visitorDetails', 0, 'id').val()).toEqual('111')
          expect(getArrayItemPropById($, 'visitorDetails', 1, 'id').val()).toEqual('112')
          expect(getArrayItemPropById($, 'visitorDetails', 2, 'id').val()).toEqual('222')

          expect($('.govuk-label[for="visitorDetails\\[0\\]\\[notes\\]"]').text()).toContain(
            'John Dasolicitor (Solicitor)',
          )
          expect($('.govuk-label[for="visitorDetails\\[1\\]\\[notes\\]"]').text()).toContain(
            'Johnny Dasolicitor (Solicitor)',
          )
          expect($('.govuk-label[for="visitorDetails\\[2\\]\\[notes\\]"]').text()).toContain('Jane Dafriend (Friend)')

          expect($('.govuk-back-link').attr('href')).toEqual(`assistance-required`)
          expect($('.govuk-button').text()).toContain('Continue')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.VISITOR_DETAILS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('GET (amend)', () => {
    it('should show Save as the button when changing Further details', () => {
      return request(app)
        .get(`/manage/amend/1/${journeyId()}/visitor-details?change=true`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('.govuk-hint').eq(0).text()).toEqual('Update an official visit')
          expect($('.govuk-back-link').attr('href')).toEqual(`./`)
          expect($('.govuk-button').text()).toContain('Save')
        })
    })
  })

  describe('POST', () => {
    it('should disallow submission if notes are too long', () => {
      return request(app)
        .post(URL)
        .send({
          visitorDetails: [
            { id: '111', notes: 'a'.repeat(241) },
            { id: '222', notes: 'a'.repeat(241) },
          ],
        })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'visitorDetails[0][notes]',
              href: '#visitorDetails[0][notes]',
              text: 'Information about assistance must be 240 characters or less',
            },
            {
              fieldId: 'visitorDetails[1][notes]',
              href: '#visitorDetails[1][notes]',
              text: 'Information about assistance must be 240 characters or less',
            },
          ]),
        )
    })

    it('should save the notes and redirect to equipment when visit type is IN_PERSON', async () => {
      await request(app)
        .post(URL)
        .send({
          visitorDetails: [
            { id: '111', notes: 'wheelchair access required' },
            { id: '222', notes: '' },
          ],
        })
        .expect(302)
        .expect('location', 'equipment')
        .expect(() => expectNoErrorMessages())

      const journeySession = (await getJourneySession(app, 'officialVisit')) as OfficialVisitJourney
      expect(journeySession.officialVisitors[0].assistanceNotes).toEqual('wheelchair access required')
      expect(journeySession.officialVisitors[1].assistanceNotes).toBeUndefined()
      // Empty notes are normalised to undefined by the validation middleware
      expect(journeySession.socialVisitors[0].assistanceNotes).toBeUndefined()
    })

    it('should redirect to comments when visit type is not IN_PERSON', () => {
      const journey = defaultJourneySession()
      journey.officialVisit.visitType = 'SOCIAL' as VisitType
      appSetup(journey)

      return request(app)
        .post(URL)
        .send({ visitorDetails: [{ id: '111', notes: 'note' }] })
        .expect(302)
        .expect('location', 'comments')
    })

    it('should call updateVisitors and return to landing when in amend mode', async () => {
      const amendJourneySession = () => ({
        ...defaultJourneySession(),
        amendVisit: {
          changePage: 'visitor-details',
        },
      })

      appSetup(amendJourneySession())

      await request(app)
        .post(`/manage/amend/1/${journeyId()}/visitor-details`)
        .send({
          visitorDetails: [
            { id: '111', notes: 'wheelchair access required' },
            { id: '222', notes: '' },
          ],
        })
        .expect(302)
        .expect('location', `/manage/amend/1/${journeyId()}`)
        .expect(() => expectFlashMessage('updateVerb', 'updated'))

      expect(officialVisitsService.updateVisitors).toHaveBeenCalledWith(
        'MDI',
        '1',
        {
          officialVisitors: [
            {
              officialVisitorId: 1,
              visitorTypeCode: 'CONTACT',
              contactId: 111,
              relationshipCode: 'SOL',
              leadVisitor: true,
              assistedVisit: true,
              assistedNotes: 'wheelchair access required',
            },
            {
              officialVisitorId: 2,
              visitorTypeCode: 'CONTACT',
              contactId: 112,
              relationshipCode: 'SOL',
              leadVisitor: false,
              assistedVisit: false,
            },
            {
              officialVisitorId: 3,
              visitorTypeCode: 'CONTACT',
              contactId: 222,
              relationshipCode: 'FRI',
              leadVisitor: false,
              assistedVisit: true,
            },
          ],
        },
        user,
      )
    })
  })
})
