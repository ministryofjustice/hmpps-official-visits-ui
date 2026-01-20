import type { Express, Response } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockTimeslots, mockFindByCriteriaVisit, mockPrisoner } from '../../../../testutils/mocks'
import { Journey } from '../../../../@types/express'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import AuditService, { Page } from '../../../../services/auditService'
import { getByIdFor, getGovukTableCell, getPageHeader, getTextById } from '../../../testutils/cheerio'
import { FindByCriteriaResults, ReferenceDataItem } from '../../../../@types/officialVisitsApi/types'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/prisonerService')
jest.mock('../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const appSetup = () => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
    userSupplier: () => user,
  })
}

beforeEach(() => {
  appSetup()
  officialVisitsService.getVisits.mockResolvedValue({
    content: Array.from({ length: 20 }, () => mockFindByCriteriaVisit),
    page: {
      totalElements: 20,
      totalPages: 2,
      number: 0,
      size: 10,
    },
  } as FindByCriteriaResults)
  officialVisitsService.getAvailableSlots.mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({
      ...mockTimeslots[0],
      dpsLocationId: `${i % 3}`,
      locationDescription: `Location${i % 3}`,
    })),
  )
  officialVisitsService.getReferenceData.mockImplementation((_: Response, code: string) => {
    if (code === 'VIS_TYPE') {
      return Promise.resolve([
        { code: 'TYPE1', description: 'Type1' },
        { code: 'TYPE2', description: 'Type2' },
      ] as ReferenceDataItem[])
    }
    if (code === 'VIS_STATUS') {
      return Promise.resolve([
        { code: 'STATUS1', description: 'Status1' },
        { code: 'STATUS2', description: 'Status2' },
      ] as ReferenceDataItem[])
    }
    return Promise.resolve([])
  })
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

          expect($('.moj-pagination__results').text()).toContain('Showing 1 to 10 of 20 total results')

          expect($('.govuk-table__header:nth-child(1)').text()).toEqual('Time and date')
          expect($('.govuk-table__header:nth-child(2)').text()).toEqual('Location')
          expect($('.govuk-table__header:nth-child(3)').text()).toEqual('Visit type')
          expect($('.govuk-table__header:nth-child(4)').text()).toEqual('Prisoner')
          expect($('.govuk-table__header:nth-child(5)').text()).toEqual('Status')
          expect($('.govuk-table__header:nth-child(6)').text()).toEqual('Action')

          expect(getGovukTableCell($, 1, 1).text()).toEqual('10:00am to 11:00am23 December 2022')
          expect(getGovukTableCell($, 1, 2).text()).toEqual('Legal visits ward')
          expect(getGovukTableCell($, 1, 3).text()).toEqual('Telephone')
          expect(getGovukTableCell($, 1, 4).text()).toEqual('Smith, JohnA1337AA')
          expect(getGovukTableCell($, 1, 4).find('a').attr('href')).toEqual('http://localhost:3001/prisoner/A1337AA')
          expect(getGovukTableCell($, 1, 5).text()).toEqual('Completed')
          expect(getGovukTableCell($, 1, 6).text()).toEqual('Select')
          expect(getGovukTableCell($, 1, 6).find('a').attr('href')).toEqual('/view/visit/1')

          // Filters
          expect(getByIdFor($, 'location').text().trim()).toEqual('Location')
          expect(getByIdFor($, 'type').text().trim()).toEqual('Visit type')
          expect(getByIdFor($, 'status').text().trim()).toEqual('Visit status')

          // Mock sets three unique locations among 10 total, ensure only the unique ones are shown
          expect($('#location > option').text()).toEqual('Location0Location1Location2')

          expect($('#type > option').text()).toEqual('Type1Type2')
          expect($('#status > option').text()).toEqual('Status1Status2')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.VIEW_OFFICIAL_VISIT_LIST_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should include valid filters and ignore invalid filters', () => {
      return request(app)
        .get(`${URL}?startDate=2022-12-23&endDate=2022-12-24&page=1&status=NOEXIST&type=TYPE1&location=1`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          // Valid filters are applied
          expect($('#type').val()).toEqual('TYPE1')
          expect($('#location').val()).toEqual('1')

          expect($('.moj-filter__tag:nth(0)').text()).toEqual('Remove this filter Location1')
          expect($('.moj-filter__tag:nth(0)').attr('href')).toEqual(
            '?page=1&startDate=2022-12-23&endDate=2022-12-24&type=TYPE1',
          )

          expect($('.moj-filter__tag:nth(1)').text()).toEqual('Remove this filter Type1')
          expect($('.moj-filter__tag:nth(1)').attr('href')).toEqual(
            '?page=1&startDate=2022-12-23&endDate=2022-12-24&location=1',
          )

          // Invalid values are ignored
          expect($('#status').val()).toEqual('')

          // Clear filters should remove all filters but keep search options
          expect($('.moj-filter__heading-action > p >.govuk-link').attr('href')).toEqual(
            '?page=1&startDate=2022-12-23&endDate=2022-12-24',
          )

          // Pagination links keep search and filter options
          expect($('.govuk-pagination__link:nth(1)').text().trim()).toEqual('2')
          expect($('.govuk-pagination__link:nth(1)').attr('href')).toEqual(
            '/view/list?page=2&startDate=2022-12-23&endDate=2022-12-24&type=TYPE1&location=1',
          )
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

    it('should error if prisoner query is 1 character', () => {
      return request(app)
        .get(`${URL}?startDate=2022-10-10&endDate=2022-10-11&prisoner=n`)
        .send({})
        .expect(() =>
          expectErrorMessages(
            [{ fieldId: 'prisoner', href: '#prisoner', text: 'Prisoner name or ID must be at least 2 characters' }],
            4,
          ),
        )
    })
  })

  describe('POST', () => {
    it('should GET redirect with entered params', () => {
      return request(app)
        .post(`${URL}`)
        .send({
          startDate: '2022-12-23',
          endDate: '2022-12-24',
          prisoner: 'A1337AA',
          location: '0',
          type: 'TYPE1',
          status: 'STATUS1',
        })
        .expect(302)
        .expect(
          'location',
          `${URL}?prisoner=A1337AA&startDate=2022-12-23&endDate=2022-12-24&page=1&status=STATUS1&type=TYPE1&location=0`,
        )
    })
  })
})
