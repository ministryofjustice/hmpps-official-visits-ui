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

const appSetup = (journeySession = {}) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession,
  })
}

beforeEach(() => {
  appSetup()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('Prisoner search handler', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(`/prisoner-search/${journeyId()}/search`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('Who is the official visit for?')
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.PRISONER_SEARCH_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    const validForm = {
      searchTerm: 'Bob',
    }

    it('should error on an empty search term form', () => {
      return request(app)
        .post(`/prisoner-search/${journeyId()}/search`)
        .send({ searchTerm: '' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'searchTerm',
              href: '#searchTerm',
              text: 'Enter at least 2 characters to search for matching names',
            },
          ]),
        )
    })

    it('should error on search terms of less than 2 characters', () => {
      return request(app)
        .post(`/prisoner-search/${journeyId()}/search`)
        .send({ searchTerm: 'j' })
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'searchTerm',
              href: '#searchTerm',
              text: 'Enter at least 2 characters to search for matching names',
            },
          ]),
        )
    })

    it('should accept a 2 letter search term criteria', () => {
      return request(app)
        .post(`/prisoner-search/${journeyId()}/search`)
        .send({ searchTerm: 'jo' })
        .expect(302)
        .expect('location', 'results')
        .expect(() => expectNoErrorMessages())
    })

    it('should accept prisoner number as the search criteria', () => {
      return request(app)
        .post(`/prisoner-search/${journeyId()}/search`)
        .send({ searchTerm: 'A1111AA' })
        .expect(302)
        .expect('location', 'results')
        .expect(() => expectNoErrorMessages())
    })

    it('should accept PNC number the search criteria', () => {
      return request(app)
        .post(`/prisoner-search/${journeyId()}/search`)
        .send({ searchTerm: '99/0909009' })
        .expect(302)
        .expect('location', 'results')
        .expect(() => expectNoErrorMessages())
    })

    it('should hold the posted fields in session', () => {
      return request(app)
        .post(`/prisoner-search/${journeyId()}/search`)
        .send(validForm)
        .expect(302)
        .expect('location', 'results')
        .then(() =>
          expectJourneySession(app, 'prisonerSearch', {
            searchTerm: 'Bob',
          }),
        )
    })
  })
})
