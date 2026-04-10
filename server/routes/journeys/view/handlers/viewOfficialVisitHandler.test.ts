import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import PrisonerService from '../../../../services/prisonerService'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockPrisoner, mockVisitByIdVisit, mockPrisonerRestrictions, mockUser } from '../../../../testutils/mocks'
import AuditService, { Page } from '../../../../services/auditService'
import { getByDataQa, getPageHeader, getValueByKey } from '../../../testutils/cheerio'
import PersonalRelationshipsService from '../../../../services/personalRelationshipsService'
import { Prisoner } from '../../../../@types/prisonerSearchApi/types'
import { convertToTitleCase } from '../../../../utils/utils'
import ManageUserService from '../../../../services/manageUsersService'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/prisonerService')
jest.mock('../../../../services/officialVisitsService')
jest.mock('../../../../services/personalRelationshipsService')
jest.mock('../../../../services/manageUsersService')

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
  prisonerService.getPrisonerByPrisonerNumber.mockResolvedValue(mockPrisoner as unknown as Prisoner)
  manageUsersService.getUserByUsername.mockResolvedValue(mockUser)
  officialVisitsService.getAllContacts.mockResolvedValue([baseMockContact])
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/view/visit/1`

const baseMockContact = {
  prisonerContactId: 7332364,
  contactId: 20085647,
  prisonerNumber: 'G4793VF',
  lastName: 'Malicious',
  firstName: 'Peter',
  relationshipTypeCode: 'OFFICIAL',
  relationshipTypeDescription: 'Official',
  relationshipToPrisonerCode: 'SOL',
  relationshipToPrisonerDescription: 'Solicitor',
  isApprovedVisitor: true,
  isNextOfKin: false,
  isEmergencyContact: false,
  isRelationshipActive: true,
  currentTerm: true,
  isStaff: false,
  restrictionSummary: {
    active: [] as { restrictionType: string; restrictionTypeDescription: string }[],
    totalActive: 0,
    totalExpired: 0,
  },
}

describe('View an official visit', () => {
  describe('GET', () => {
    it('should render the correct view page without backTo param', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').text()).toEqual('Manage existing official visits')
          expect(getPageHeader($)).toEqual('Official visit')

          expect(res.text).toContain('ACTIVE RESTRICTION IN PLACE')
          expect(res.text).toContain('moj-badge--red')

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

          expect($('.govuk-link:contains("Cancel visit")').attr('href')).toEqual('/view/visit/1/cancel')
          expect($('.govuk-link:contains("Complete visit")').attr('href')).toEqual('/view/visit/1/complete')

          expect($('.govuk-button[href="/view/visit/1/movement-slip"]').length).toBe(1)
          expect($('.govuk-button[href="/manage/amend/1"]').length).toBe(1)

          expect(getValueByKey($, 'Date')).toEqual('Thursday, 1 January 2026')
          expect(getValueByKey($, 'Time')).toEqual('10:00am to 11:00am (1 hour)')
          expect(getValueByKey($, 'Visit status')).toEqual('Scheduled')
          expect(getValueByKey($, 'Visit reference number')).toEqual('1')
          expect(getValueByKey($, 'Completion notes')).toBeNull()
          expect(getValueByKey($, 'Cancellation notes')).toBeNull()
          expect(getValueByKey($, 'Location')).toEqual('First Location')
          expect(getValueByKey($, 'Visit type')).toEqual('Video')
          expect(getValueByKey($, 'Prisoner notes')).toEqual('prisoner notes')
          expect(getValueByKey($, 'Staff notes')).toEqual('staff notes')
          expect(getValueByKey($, 'Created by')).toEqual('Test User (Monday, 19 January 2026)')
          expect(getValueByKey($, 'Last modified')).toEqual('Test User (Monday, 19 January 2026)')
          expect(getValueByKey($, 'Visitor concerns', 0)).toEqual('visit level visitor concern notes')

          expect(getValueByKey($, 'Contact type')).toEqual('Official')
          expect(getValueByKey($, 'Does this visitor need assistance?')).toEqual('Yes')
          expect(getValueByKey($, 'Assistance details')).toEqual('Assistance details')
          expect(getValueByKey($, 'Does this visitor need equipment?')).toEqual('Yes')
          expect(getValueByKey($, 'Equipment')).toEqual('Laptop')
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

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.VIEW_OFFICIAL_VISIT_PAGE, {
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
          expect(getValueByKey($, 'Time')).toEqual('10:00am to 11:00am (1 hour)')
          expect(getValueByKey($, 'Visit status')).toEqual('Scheduled')
          expect(getValueByKey($, 'Visit reference number')).toEqual('1')
          expect(getValueByKey($, 'Location')).toEqual('First Location')
          expect(getValueByKey($, 'Visit type')).toEqual('Video')
          expect(getValueByKey($, 'Prisoner notes')).toEqual('None')
          expect(getValueByKey($, 'Staff notes')).toEqual('None')
          expect(getValueByKey($, 'Created by')).toEqual('Test User (Monday, 19 January 2026)')
          expect(getValueByKey($, 'Last modified')).toEqual('Test User (Monday, 19 January 2026)')
          // Visitor concerns is the only field that shouldn't show when there is no data
          expect(getValueByKey($, 'Visitor concerns')).toBeFalsy()

          expect(getValueByKey($, 'Contact type')).toEqual('Official')
          expect(getValueByKey($, 'Does this visitor need assistance?')).toEqual('Yes')
          expect(getValueByKey($, 'Assistance details')).toEqual('None')
          expect(getValueByKey($, 'Does this visitor need equipment?')).toEqual('No')
          expect(getValueByKey($, 'Equipment')).toEqual('None')
          expect(getValueByKey($, 'Email')).toEqual('None')
          expect(getValueByKey($, 'Telephone number')).toEqual('None')

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

          expect($('.govuk-button:contains("Amend visit")').attr('href')).toEqual(`/manage/amend/1?backTo=${b64}`)
          expect($('.govuk-link:contains("Cancel visit")').attr('href')).toEqual(`/view/visit/1/cancel?backTo=${b64}`)
          expect($('.govuk-link:contains("Complete visit")').attr('href')).toEqual(
            `/view/visit/1/complete?backTo=${b64}`,
          )
        })
    })

    it('should render with completion notes when the visit is completed', () => {
      officialVisitsService.getOfficialVisitById.mockResolvedValue({
        ...mockVisitByIdVisit,
        visitStatus: 'COMPLETED',
        visitStatusDescription: 'Completed',
        completionNotes: 'Visit completed',
        completionDescription: 'Normal completion',
        searchTypeDescription: 'Full search',
      })
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').text()).toEqual('Manage existing official visits')
          expect(getPageHeader($)).toEqual('Official visit')

          expect(getValueByKey($, 'Visit status')).toEqual('Completed')
          expect(getValueByKey($, 'Cancellation notes')).toBeNull()
          expect(getValueByKey($, 'Completion notes')).toEqual('Visit completed')
          expect(getValueByKey($, 'Completion reason')).toEqual('Normal completion')
          expect(getValueByKey($, 'Search type')).toEqual('Full search')
          expect($('.govuk-button:contains("Amend visit")').length).toBe(0)
          expect($('.govuk-button:contains("Cancel visit")').length).toBe(0)
        })
    })

    it('should render with cancellation notes when the visit is cancelled', () => {
      officialVisitsService.getOfficialVisitById.mockResolvedValue({
        ...mockVisitByIdVisit,
        visitStatus: 'CANCELLED',
        visitStatusDescription: 'Cancelled',
        completionNotes: 'Cancelled for reasons',
      })

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').text()).toEqual('Manage existing official visits')
          expect(getPageHeader($)).toEqual('Official visit')

          expect(getValueByKey($, 'Visit status')).toEqual('Cancelled')
          expect(getValueByKey($, 'Cancellation notes')).toEqual('Cancelled for reasons')
          expect($('.govuk-button:contains("Amend visit")').length).toBe(0)
          expect($('.govuk-button:contains("Cancel visit")').length).toBe(0)
          expect(getValueByKey($, 'Completion reason')).toBeNull()
          expect(getValueByKey($, 'Search type')).toBeNull()
        })
    })

    it('should display restrictions badge with existing mock data (has restriction without expiry)', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('ACTIVE RESTRICTION IN PLACE')
          expect(res.text).toContain('moj-badge--red')
          expect(res.text).toContain('prisoner-restrictions-table')
          expect(res.text).toContain('Type of restriction')
          expect(res.text).toContain('Comments')
          expect(res.text).toContain('Date from')
          expect(res.text).toContain('Date to')
        })
    })

    it('should not display restrictions badge when prisoner has no active restrictions', () => {
      personalRelationshipsService.getPrisonerRestrictions.mockResolvedValue({ content: [] })

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).not.toContain('ACTIVE RESTRICTION IN PLACE')
          expect(res.text).not.toContain('ACTIVE RESTRICTIONS IN PLACE')
          expect(res.text).not.toContain('moj-badge--red')
        })
    })

    it('should display visitor restrictions when contacts have restrictions', () => {
      const mockContactsWithRestrictions = [
        {
          prisonerContactId: 7332364,
          contactId: 20085647,
          prisonerNumber: 'G4793VF',
          lastName: 'Malicious',
          firstName: 'Peter',
          relationshipTypeCode: 'O',
          relationshipTypeDescription: 'Official',
          relationshipToPrisonerCode: 'SOL',
          relationshipToPrisonerDescription: 'Solicitor',
          isApprovedVisitor: true,
          isNextOfKin: false,
          isEmergencyContact: false,
          isRelationshipActive: true,
          currentTerm: true,
          isStaff: false,
          restrictionSummary: {
            active: [
              {
                restrictionType: 'BAN',
                restrictionTypeDescription: 'Banned',
              },
            ],
            totalActive: 1,
            totalExpired: 0,
          },
        },
      ]

      officialVisitsService.getAllContacts.mockResolvedValue(mockContactsWithRestrictions)

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('Banned')
          expect(res.text).toContain('govuk-tag--red')
        })
    })

    it('should show interruption card when visitor has no relationship with prisoner (contact not found)', async () => {
      officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
      officialVisitsService.getAllContacts.mockResolvedValue([])

      const res = await request(app).get(URL)
      expect(res.headers['content-type']).toMatch(/html/)
      expect(officialVisitsService.getAllContacts).toHaveBeenCalled()
      expect(res.text).toContain('problem with this visit')
      expect(res.text).toContain('moj-interruption-card')
      expect(res.text).toContain('Continue')
      expect(res.text).toContain('/view/visit/1?continue=true')
    })

    it('should show interruption card when visitor is not approved', async () => {
      officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
      officialVisitsService.getAllContacts.mockResolvedValue([{ ...baseMockContact, isApprovedVisitor: false }])

      const res = await request(app).get(URL)
      expect(res.text).toContain('problem with this visit')
      expect(res.text).toContain('moj-interruption-card')
    })

    it('should show interruption card when visit has social visitors and prison does not support social visits', async () => {
      const socialVisitMock = {
        ...mockVisitByIdVisit,
        officialVisitors: [
          {
            ...mockVisitByIdVisit.officialVisitors[0],
            relationshipTypeCode: 'SOCIAL' as const,
            relationshipTypeDescription: 'Social',
            relationshipCode: 'FRI',
            relationshipDescription: 'Friend',
          },
        ],
      }
      officialVisitsService.getOfficialVisitById.mockResolvedValue(socialVisitMock)
      officialVisitsService.getAllContacts.mockResolvedValue([
        {
          ...baseMockContact,
          relationshipTypeCode: 'S',
          relationshipTypeDescription: 'Social',
          relationshipToPrisonerCode: 'FRI',
          relationshipToPrisonerDescription: 'Friend',
        },
      ])

      const res = await request(app).get(URL)
      expect(res.text).toContain('problem with this visit')
      expect(res.text).toContain('moj-interruption-card')
    })

    it('should not show interruption card when continue=true query param is present', async () => {
      officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
      officialVisitsService.getAllContacts.mockResolvedValue([])

      const res = await request(app).get(`${URL}?continue=true`)
      const $ = cheerio.load(res.text)
      expect(res.text).not.toContain('problem with this visit')
      expect(res.text).not.toContain('moj-interruption-card')
      expect(getPageHeader($)).toEqual('Official visit')
    })
  })
})
