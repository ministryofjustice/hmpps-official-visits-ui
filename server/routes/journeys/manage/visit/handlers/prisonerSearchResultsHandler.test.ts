import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getPageHeader, getGovukTableCell } from '../../../../testutils/cheerio'
import expectJourneySession from '../../../../testutils/testUtilRoute'
import { Journey } from '../../../../../@types/express'
import { PagePrisoner } from '../../../../../@types/prisonerSearchApi/types'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const appSetup = (journeySession: Partial<Journey>) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
  appSetup({})
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Prisoner search results handler', () => {
  describe('GET', () => {
    it('should render the search results page with a single result', async () => {
      const results = {
        content: [
          {
            prisonerNumber: 'A1234AA',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1989-06-01',
            cellLocation: 'C-1-1',
            pncNumber: '99/12345',
            croNumber: 'CRO123',
          },
        ],
        number: 0,
        totalPages: 1,
        totalElements: 1,
        first: true,
        last: true,
      } as PagePrisoner

      prisonerService.searchInCaseload.mockResolvedValue(results)

      appSetup({ officialVisit: { searchTerm: 'Doe' } })

      return request(app)
        .get(`/manage/create/${journeyId()}/results`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect(getPageHeader($)).toEqual('Search results  (Page 1 of 1)')

          expect($('h3.govuk-heading-m').text().trim()).toBe('There is 1 matching person.')
          expect(getGovukTableCell($, 1, 1).find('a').text().trim()).toBe('Doe, John')
          expect(getGovukTableCell($, 1, 2).text().trim()).toBe('A1234AA')
          expect(getGovukTableCell($, 1, 3).text().trim()).toBe('1 June 1989')
          expect(getGovukTableCell($, 1, 4).text().trim()).toBe('C-1-1')
          expect(getGovukTableCell($, 1, 5).text().trim()).toBe('99/12345')
          expect(getGovukTableCell($, 1, 6).text().trim()).toBe('CRO123')
          expect(getGovukTableCell($, 1, 7).find('a').attr('href')).toBe(
            'prisoner-select?prisonerNumber=A1234AA&page=0',
          )

          expect(prisonerService.searchInCaseload).toHaveBeenCalledWith('Doe', 'HEI', user, {
            page: 0,
            size: expect.any(Number),
          })

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.PRISONER_SEARCH_RESULTS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should render the search results page with no results', async () => {
      const results = {
        content: [],
        number: 0,
        totalPages: 0,
        totalElements: 0,
        first: true,
        last: true,
      } as PagePrisoner

      prisonerService.searchInCaseload.mockResolvedValue(results)

      appSetup({ officialVisit: { searchTerm: 'Smith' } })

      return request(app)
        .get(`/manage/create/${journeyId()}/results`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect(getPageHeader($)).toEqual('Search results  (Page 1 of 0)')
          expect($('.govuk-table__row').length).toBe(0)

          expect($('h3.govuk-heading-m').text().trim()).toBe('There are no results for this search criteria')

          expect(prisonerService.searchInCaseload).toHaveBeenCalledWith('Smith', 'HEI', user, {
            page: 0,
            size: expect.any(Number),
          })

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.PRISONER_SEARCH_RESULTS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should render the search results page with pagination', async () => {
      const results = {
        content: [
          {
            prisonerNumber: 'A1234AA',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1989-06-01',
            cellLocation: 'C-1-1',
            pncNumber: '99/12345',
            croNumber: 'CRO123',
          },
        ],
        number: 1,
        totalPages: 3,
        totalElements: 5,
        first: false,
        last: false,
      } as PagePrisoner

      prisonerService.searchInCaseload.mockResolvedValue(results)

      appSetup({ officialVisit: { searchTerm: 'Smith' } })

      return request(app)
        .get(`/manage/create/${journeyId()}/results?page=1`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect(getPageHeader($)).toEqual('Search results  (Page 2 of 3)')

          // Pagination should be present with correct links
          expect($('.govuk-pagination__item').length).toBe(3)
          expect($('.govuk-pagination__next a').attr('href')).toBe('?page=2')
          expect($('.govuk-pagination__item').eq(0).find('a').attr('href')).toBe('?page=0')
          expect($('.govuk-pagination__item').eq(1).find('a').attr('href')).toBe('?page=1')
          expect($('.govuk-pagination__item').eq(2).find('a').attr('href')).toBe('?page=2')

          expect(prisonerService.searchInCaseload).toHaveBeenCalledWith('Smith', 'HEI', user, {
            page: 1,
            size: expect.any(Number),
          })
        })
    })
  })
  describe('POST', () => {
    it('should hold the posted fields in session and redirect to results', () => {
      appSetup({})

      return request(app)
        .post(`/manage/create/${journeyId()}/results`)
        .send({ searchTerm: 'Smith' })
        .expect(302)
        .expect('location', 'results')
        .then(() => expectJourneySession(app, 'officialVisit', { searchTerm: 'Smith' }))
    })
  })
})
