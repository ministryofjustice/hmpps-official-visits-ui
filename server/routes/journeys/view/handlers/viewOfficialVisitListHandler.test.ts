import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockFindByCriteriaResults, mockTimeslots, prisoner } from '../../../../testutils/mocks'
import { Journey } from '../../../../@types/express'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import AuditService, { Page } from '../../../../services/auditService'
import { getPageHeader, getTextById } from '../../../testutils/cheerio'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/prisonerService')
jest.mock('../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const appSetup = (
  journeySession = {
    officialVisit: {
      prisoner: {
        ...prisoner,
      },
      prisonCode: 'MDI',
      availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
    },
  },
) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
  appSetup()
  officialVisitsService.getVisits.mockResolvedValue(mockFindByCriteriaResults)
  officialVisitsService.getAvailableSlots.mockResolvedValue(mockTimeslots)
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/view/list`

describe('Search for an official visit', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-back-link').attr('href')).toEqual('/')
          expect($('.govuk-hint').text()).toEqual('Manage existing official visits')
          expect(getPageHeader($)).toEqual('Search for an official visit')

          expect(getTextById($, 'prisoner')).toEqual('')
          expect($('#startDate').attr('value')).toEqual(
            new Date().toISOString().substring(0, 10).split('-').reverse().join('/'),
          )
          expect($('#endDate').attr('value')).toEqual(
            new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
              .toISOString()
              .substring(0, 10)
              .split('-')
              .reverse()
              .join('/'),
          )

          expect($('.moj-pagination__results').text()).toContain('Showing 1 to 1 of 1 results')

          expect($('.govuk-table__header:nth-child(1)').text()).toEqual('Time and date')
          expect($('.govuk-table__header:nth-child(2)').text()).toEqual('Location')
          expect($('.govuk-table__header:nth-child(3)').text()).toEqual('Visit type')
          expect($('.govuk-table__header:nth-child(4)').text()).toEqual('Prisoner')
          expect($('.govuk-table__header:nth-child(5)').text()).toEqual('Status')
          expect($('.govuk-table__header:nth-child(6)').text()).toEqual('Action')

          expect($('.govuk-table__body > .govuk-table__row > .govuk-table__cell:nth-child(1)').text()).toEqual(
            '10:00am to 11:00am23 December 2022',
          )
          expect($('.govuk-table__body > .govuk-table__row > .govuk-table__cell:nth-child(2)').text()).toEqual(
            'Legal visits ward',
          )
          expect($('.govuk-table__body > .govuk-table__row > .govuk-table__cell:nth-child(3)').text()).toEqual(
            'Telephone',
          )
          expect($('.govuk-table__body > .govuk-table__row > .govuk-table__cell:nth-child(4)').text()).toEqual(
            'Smith, JohnA1337AA',
          )
          expect(
            $('.govuk-table__body > .govuk-table__row > .govuk-table__cell:nth-child(4) > a').attr('href'),
          ).toEqual('http://localhost:3001/prisoner/A1337AA')
          expect($('.govuk-table__body > .govuk-table__row > .govuk-table__cell:nth-child(5)').text()).toEqual(
            'Completed',
          )
          expect($('.govuk-table__body > .govuk-table__row > .govuk-table__cell:nth-child(6)').text()).toEqual('Select')
          expect(
            $('.govuk-table__body > .govuk-table__row > .govuk-table__cell:nth-child(6) > a').attr('href'),
          ).toEqual('/view/1')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.VIEW_OFFICIAL_VISIT_LIST_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should error if an invalid date is entered', () => {
      return request(app)
        .get(`${URL}?startDate=2022-13-32&endDate=2022-13-32`)
        .send({})
        .expect(() =>
          expectErrorMessages(
            [
              { fieldId: 'startDate', href: '#startDate', text: 'From date must be a real date' },
              { fieldId: 'endDate', href: '#endDate', text: 'To date must be a real date' },
            ],
            4,
          ),
        )
    })

    it('should error if endDate is before startDate', () => {
      return request(app)
        .get(`${URL}?startDate=2023-01-01&endDate=2022-01-01`)
        .send({})
        .expect(() =>
          expectErrorMessages(
            [{ fieldId: 'endDate', href: '#endDate', text: 'To date must be after the from date' }],
            4,
          ),
        )
    })
  })

  describe('POST', () => {
    it('should GET redirect with entered params', () => {
      return request(app)
        .post(`${URL}`)
        .send({ startDate: '2022-12-23', endDate: '2022-12-24' })
        .expect(302)
        .expect('location', `${URL}?startDate=2022-12-23&endDate=2022-12-24&page=1`)
    })
  })
})
