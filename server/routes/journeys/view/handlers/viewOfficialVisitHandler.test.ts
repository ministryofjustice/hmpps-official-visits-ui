import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockPrisoner, mockVisitByIdVisit, mockPrisonerRestrictions } from '../../../../testutils/mocks'
import AuditService, { Page } from '../../../../services/auditService'
import { getByDataQa, getPageHeader, getValueByKey } from '../../../testutils/cheerio'
import PersonalRelationshipsService from '../../../../services/personalRelationshipsService'
import { Prisoner } from '../../../../@types/prisonerSearchApi/types'
import { convertToTitleCase } from '../../../../utils/utils'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/prisonerService')
jest.mock('../../../../services/officialVisitsService')
jest.mock('../../../../services/personalRelationshipsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const personalRelationshipsService = new PersonalRelationshipsService(null) as jest.Mocked<PersonalRelationshipsService>

let app: Express

const appSetup = () => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService, personalRelationshipsService },
    userSupplier: () => user,
  })
}

beforeEach(() => {
  appSetup()
  officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
  personalRelationshipsService.getPrisonerRestrictions.mockResolvedValue({ content: mockPrisonerRestrictions })
  prisonerService.getPrisonerByPrisonerNumber.mockResolvedValue(mockPrisoner as unknown as Prisoner)
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/view/visit/1`

describe('Search for an official visit', () => {
  describe('GET', () => {
    it('should render the correct view page without backTo param', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').text()).toEqual('Manage existing official visits')
          expect(getPageHeader($)).toEqual('Official visit')

          expect(getByDataQa($, 'mini-profile-person-profile-link').text().trim()).toEqual(
            convertToTitleCase(`${mockPrisoner.lastName}, ${mockPrisoner.firstName}`),
          )
          expect(getByDataQa($, 'mini-profile-prisoner-number').text().trim()).toEqual(mockPrisoner.prisonerNumber)
          expect(getByDataQa($, 'mini-profile-dob').text().trim()).toEqual('1 June 1989')
          expect(getByDataQa($, 'mini-profile-cell-location').text().trim()).toEqual(mockPrisoner.cellLocation)
          expect(getByDataQa($, 'mini-profile-prison-name').text().trim()).toEqual(mockPrisoner.prisonName)
          expect(getByDataQa($, 'contact-A1337AA-alerts-restrictions').text().replace(/\s+/g, '')).toEqual(
            '3restrictionsand0alerts',
          )

          expect($('.govuk-link').eq(0).text()).toContain('Amend this visit')
          expect($('.govuk-link').eq(1).text()).toContain('Cancel visit')
          expect($('.govuk-link').eq(2).text()).toContain('Complete visit')

          expect($('.govuk-link').eq(0).attr('href')).toEqual('/view/visit/1/amend')
          expect($('.govuk-link').eq(1).attr('href')).toEqual('/view/visit/1/cancel')
          expect($('.govuk-link').eq(2).attr('href')).toEqual('/view/visit/1/complete')

          expect(getValueByKey($, 'Date')).toEqual('Thursday, 1 January 2026')
          expect(getValueByKey($, 'Time')).toEqual('10:00am to 11:00am (1 hour)')
          expect(getValueByKey($, 'Visit status')).toEqual('Scheduled')
          expect(getValueByKey($, 'Visit reference number')).toEqual('1')
          expect(getValueByKey($, 'Location')).toEqual('First Location')
          expect(getValueByKey($, 'Visit type')).toEqual('Video')
          expect(getValueByKey($, 'Notes')).toEqual('Extra information')
          expect(getValueByKey($, 'Created by')).toEqual('USERNAME_GEN (Monday, 19 January 2026)')
          expect(getValueByKey($, 'Last modified')).toEqual('USERNAME_GEN (Monday, 19 January 2026)')

          expect(getValueByKey($, 'Contact type')).toEqual('Official')
          expect(getValueByKey($, 'Does this visitor need assistance')).toEqual('Yes')
          expect(getValueByKey($, 'Assistance details')).toEqual('Assistance details')
          expect(getValueByKey($, 'Equipment')).toEqual('Laptop')
          expect(getValueByKey($, 'Visitor concerns')).toEqual('Assistance details')
          expect(getValueByKey($, 'Email')).toEqual('test@test.com')
          expect(getValueByKey($, 'Telephone number')).toEqual('0123456789')

          expect($('.govuk-summary-card__title > a').text()).toEqual('Peter Malicious')
          expect($('.govuk-summary-card__title > a').attr('href')).toEqual(
            'http://localhost:3001/prisoner/G4793VF/contacts/manage/20085647/relationship/7332364',
          )

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.VIEW_OFFICIAL_VISIT_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should append the backTo param to cancel and complete links', () => {
      const b64 = encodeURIComponent(btoa('/view/list?page=1&startDate=2026-01-28&endDate=2026-03-29'))
      return request(app)
        .get(`${URL}?backTo=${b64}`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').text()).toEqual('Manage existing official visits')
          expect(getPageHeader($)).toEqual('Official visit')

          expect($('.govuk-link').eq(0).text()).toContain('Amend this visit')
          expect($('.govuk-link').eq(1).text()).toContain('Cancel visit')
          expect($('.govuk-link').eq(2).text()).toContain('Complete visit')

          expect($('.govuk-link').eq(0).attr('href')).toEqual(`/view/visit/1/amend?backTo=${b64}`)
          expect($('.govuk-link').eq(1).attr('href')).toEqual(`/view/visit/1/cancel?backTo=${b64}`)
          expect($('.govuk-link').eq(2).attr('href')).toEqual(`/view/visit/1/complete?backTo=${b64}`)
        })
    })
  })
})
