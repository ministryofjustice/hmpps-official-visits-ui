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

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const appSetup = (journeySession = { officialVisit: {} }) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
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

const UUID = journeyId()
const URL = `/manage/create/${UUID}/visit-type`

describe('Visit type handler', () => {
  describe('GET (create)', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          // There should not be a progress tracker on this page
          expect($('.moj-progress-bar').length).toBeTruthy()

          expect($('.govuk-hint').text()).toEqual('Schedule an official visit')
          expect(heading).toEqual('What type of official visit?')

          expect($('.govuk-back-link').attr('href')).toEqual(`results?page=0`)
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to homepage')
          expect($('.govuk-link').last().attr('href')).toContain(`cancellation-check?stepsChecked=1`)

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.VISIT_TYPE_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('GET (amend)', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(`/manage/amend/1/${UUID}/visit-type?change=true`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          // There should not be a progress tracker on this page
          expect($('.moj-progress-bar').length).toBeFalsy()
          expect($('.govuk-back-link').attr('href')).toEqual(`./`)

          expect($('.govuk-hint').text()).toEqual('Amend an official visit')
          expect(heading).toEqual('What type of official visit?')

          // Amend will always show Continue button because it can't update without time-slot
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to visit details')
          expect($('.govuk-link').last().attr('href')).toContain(`./`)

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

    it('should redirect to time-slot with date query param when in amend mode', () => {
      appSetup({ officialVisit: { visitDate: '2025-12-25' } })
      return request(app)
        .post(`/manage/amend/1/${UUID}/visit-type`)
        .send({ visitType: 'PHONE' })
        .expect(302)
        .expect('location', 'time-slot?date=2025-12-25')
        .expect(() => expectNoErrorMessages())
    })
  })
})
