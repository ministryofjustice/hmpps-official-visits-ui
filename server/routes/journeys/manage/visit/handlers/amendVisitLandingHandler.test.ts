import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import PrisonerService from '../../../../../services/prisonerService'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import { mockPrisoner, mockVisitByIdVisit, mockPrisonerRestrictions, mockUser } from '../../../../../testutils/mocks'
import AuditService, { Page } from '../../../../../services/auditService'
import { getActionsByKey, getByDataQa, getPageHeader, getValueByKey } from '../../../../testutils/cheerio'
import PersonalRelationshipsService from '../../../../../services/personalRelationshipsService'
import { Prisoner } from '../../../../../@types/prisonerSearchApi/types'
import { convertToTitleCase } from '../../../../../utils/utils'
import ManageUserService from '../../../../../services/manageUsersService'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')
jest.mock('../../../../../services/personalRelationshipsService')
jest.mock('../../../../../services/manageUsersService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const personalRelationshipsService = new PersonalRelationshipsService(null) as jest.Mocked<PersonalRelationshipsService>
const manageUsersService = new ManageUserService(null) as jest.Mocked<ManageUserService>

let app: Express

const appSetup = () => {
  app = appWithAllRoutes({
    services: {
      auditService,
      prisonerService,
      officialVisitsService,
      personalRelationshipsService,
      manageUsersService,
    },
    userSupplier: () => user,
  })
}

beforeEach(() => {
  appSetup()
  officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
  personalRelationshipsService.getPrisonerRestrictions.mockResolvedValue({ content: mockPrisonerRestrictions })
  manageUsersService.getUserByUsername.mockResolvedValue(mockUser)
  prisonerService.getPrisonerByPrisonerNumber.mockResolvedValue(mockPrisoner as unknown as Prisoner)
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/amend/1/${journeyId()}`

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
            convertToTitleCase(`Harrison, Tim`),
          )
          expect(getByDataQa($, 'mini-profile-prisoner-number').text().trim()).toEqual('G4793VF')
          expect(getByDataQa($, 'mini-profile-dob').text().trim()).toEqual('27 June 1986')
          expect(getByDataQa($, 'mini-profile-cell-location').text().trim()).toEqual('2-1-007')
          expect(getByDataQa($, 'mini-profile-prison-name').text().trim()).toEqual('Example Prison (EXP)')
          expect(getByDataQa($, 'contact-G4793VF-alerts-restrictions').text().replace(/\s+/g, '')).toEqual(
            '3restrictionsand0alerts',
          )

          // Amend, cancel and complete links for the visit should not be shown
          expect($('.a[href*="amend"]').text()).toBeFalsy()
          expect($('.a[href*="/view/visit/1/cancel"]').text()).toBeFalsy()
          expect($('.a[href*="complete"]').text()).toBeFalsy()

          // No buttons on this page
          expect($('.govuk-button').text()).toBeFalsy()

          expect(getValueByKey($, 'Date')).toEqual('Thursday, 1 January 2026')
          expect(getActionsByKey($, 'Date', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/time-slot/)

          expect(getValueByKey($, 'Time')).toEqual('10:00am to 11:00am (1 hour)')
          expect(getActionsByKey($, 'Time', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/time-slot/)

          expect(getValueByKey($, 'Visit status')).toEqual('Scheduled')
          expect(getValueByKey($, 'Visit reference number')).toEqual('1')
          expect(getValueByKey($, 'Completion notes')).toBeNull()
          expect(getValueByKey($, 'Cancellation notes')).toBeNull()

          expect(getValueByKey($, 'Location')).toEqual('First Location')
          expect(getActionsByKey($, 'Location', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/time-slot/)

          expect(getValueByKey($, 'Visit type')).toEqual('Video')
          expect(getActionsByKey($, 'Visit type', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/visit-type/)

          expect(getValueByKey($, 'Prisoner notes')).toEqual('prisoner notes')
          expect(getActionsByKey($, 'Prisoner notes', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/comments/)

          expect(getValueByKey($, 'Staff notes')).toEqual('staff notes')
          expect(getActionsByKey($, 'Staff notes', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/comments/)

          expect(getValueByKey($, 'Created by')).toEqual('Test User (Monday, 19 January 2026)')
          expect(getValueByKey($, 'Last modified')).toEqual('Test User (Monday, 19 January 2026)')
          expect(getValueByKey($, 'Visitor concerns', 0)).toEqual('visit level visitor concern notes')
          expect(getValueByKey($, 'Contact type')).toEqual('Official')

          expect(getValueByKey($, 'Does this visitor need assistance?')).toEqual('Yes')
          expect(getActionsByKey($, 'Does this visitor need assistance?', 0, 0).attr('href')).toMatch(
            /\/manage\/amend\/1(.+)\/assistance-required/,
          )

          expect(getValueByKey($, 'Assistance details')).toEqual('Assistance details')
          expect(getActionsByKey($, 'Assistance details', 0, 0).attr('href')).toMatch(
            /\/manage\/amend\/1(.+)\/assistance-required/,
          )

          expect(getValueByKey($, 'Does this visitor need equipment?')).toEqual('Yes')
          expect(getActionsByKey($, 'Does this visitor need equipment?', 0, 0).attr('href')).toMatch(
            /\/manage\/amend\/1(.+)\/equipment/,
          )

          expect(getValueByKey($, 'Equipment')).toEqual('Laptop')
          expect(getActionsByKey($, 'Equipment', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/equipment/)

          expect(getValueByKey($, 'Email')).toEqual('test@test.com')
          expect(getValueByKey($, 'Telephone number')).toEqual('0123456789')

          expect($('.govuk-summary-card__title > a').text()).toEqual('Peter Malicious')
          expect($('.govuk-summary-card__title > a').attr('href')).toEqual(
            'http://localhost:3001/prisoner/G4793VF/contacts/manage/20085647/relationship/7332364',
          )

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.AMEND_LANDING_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should handle null visit.updatedBy', () => {
      officialVisitsService.getOfficialVisitById.mockResolvedValue({ ...mockVisitByIdVisit, updatedBy: null })
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').text()).toEqual('Manage existing official visits')
          expect(getPageHeader($)).toEqual('Official visit')

          expect(getValueByKey($, 'Created by')).toEqual('Test User (Monday, 19 January 2026)')
          expect(getValueByKey($, 'Last modified')).toEqual('Test User (Monday, 19 January 2026)')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.AMEND_LANDING_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should render the correct view page with None fields where data is not present', () => {
      officialVisitsService.getOfficialVisitById.mockResolvedValue({
        ...mockVisitByIdVisit,
        prisonerNotes: null,
        staffNotes: null,
        visitorConcernNotes: null,
        officialVisitors: [
          {
            ...mockVisitByIdVisit.officialVisitors[0],
            assistanceNotes: null,
            visitorNotes: null,
            visitorEquipment: null,
            emailAddress: null,
            phoneNumber: null,
          },
        ],
      })
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').text()).toEqual('Manage existing official visits')
          expect(getPageHeader($)).toEqual('Official visit')

          expect(getValueByKey($, 'Date')).toEqual('Thursday, 1 January 2026')
          expect(getActionsByKey($, 'Date', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/time-slot/)
          expect(getValueByKey($, 'Time')).toEqual('10:00am to 11:00am (1 hour)')
          expect(getActionsByKey($, 'Time', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/time-slot/)
          expect(getValueByKey($, 'Visit status')).toEqual('Scheduled')
          expect(getValueByKey($, 'Visit reference number')).toEqual('1')
          expect(getValueByKey($, 'Location')).toEqual('First Location')
          expect(getActionsByKey($, 'Location', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/time-slot/)
          expect(getValueByKey($, 'Visit type')).toEqual('Video')
          expect(getActionsByKey($, 'Visit type', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/visit-type/)
          expect(getValueByKey($, 'Prisoner notes')).toEqual('None')
          expect(getActionsByKey($, 'Prisoner notes', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/comments/)
          expect(getValueByKey($, 'Staff notes')).toEqual('None')
          expect(getActionsByKey($, 'Staff notes', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/comments/)
          expect(getValueByKey($, 'Created by')).toEqual('Test User (Monday, 19 January 2026)')
          expect(getValueByKey($, 'Last modified')).toEqual('Test User (Monday, 19 January 2026)')
          // Visitor concerns is the only field that shouldn't show when there is no data
          expect(getValueByKey($, 'Visitor concerns')).toBeFalsy()

          expect(getValueByKey($, 'Contact type')).toEqual('Official')
          expect(getValueByKey($, 'Does this visitor need assistance?')).toEqual('Yes')
          expect(getActionsByKey($, 'Does this visitor need assistance?', 0, 0).attr('href')).toMatch(
            /\/manage\/amend\/1(.+)\/assistance-required/,
          )
          expect(getValueByKey($, 'Assistance details')).toEqual('None')
          expect(getActionsByKey($, 'Assistance details', 0, 0).attr('href')).toMatch(
            /\/manage\/amend\/1(.+)\/assistance-required/,
          )
          expect(getValueByKey($, 'Does this visitor need equipment?')).toEqual('No')
          expect(getActionsByKey($, 'Does this visitor need equipment?', 0, 0).attr('href')).toMatch(
            /\/manage\/amend\/1(.+)\/equipment/,
          )
          expect(getValueByKey($, 'Equipment')).toEqual('None')
          expect(getActionsByKey($, 'Equipment', 0, 0).attr('href')).toMatch(/\/manage\/amend\/1(.+)\/equipment/)
          expect(getValueByKey($, 'Email')).toEqual('None')
          expect(getValueByKey($, 'Telephone number')).toEqual('None')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.AMEND_LANDING_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })
})
