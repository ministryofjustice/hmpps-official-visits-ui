import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import { getPageHeader, getValueByKey } from '../../../../testutils/cheerio'
import { Journey } from '../../../../../@types/express'
import { OfficialVisitJourney } from '../journey'
import { AvailableSlot, RestrictionSummary } from '../../../../../@types/officialVisitsApi/types'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const mockOfficialVisitJourney = {
  searchPage: '0',
  searchTerm: 'Tim',
  prisonCode: 'MDI',
  prisonName: 'Moorland (HMP & YOI)',
  prisoner: {
    firstName: 'TIM',
    lastName: 'HARRISON',
    dateOfBirth: '1986-06-27',
    prisonerNumber: 'G4793VF',
    cellLocation: '2-1-007',
    pncNumber: '99/58816L',
    croNumber: '45815/99U',
    prisonCode: 'MDI',
    prisonName: 'Moorland (HMP & YOI)',
    restrictions: [
      {
        prisonerRestrictionId: 175317,
        prisonerNumber: 'G4793VF',
        restrictionType: 'PREINF',
        restrictionTypeDescription: 'Previous info',
        effectiveDate: '2024-10-02',
        authorisedUsername: 'JDIMBLEBY_GEN',
        authorisedByDisplayName: 'Jo Dimbleby',
        currentTerm: true,
        createdBy: 'JDIMBLEBY_GEN',
        createdTime: '2024-10-02T11:58:01.285998',
      },
    ],
    alertsCount: 10,
    restrictionsCount: 1,
  },
  visitType: 'IN_PERSON',
  visitTypeDescription: 'Attend in person',
  selectedTimeSlot: {
    visitSlotId: 3961,
    timeSlotId: 2029,
    prisonCode: 'MDI',
    dayCode: 'MON',
    dayDescription: 'Monday',
    visitDate: '2026-01-26',
    startTime: '13:30',
    endTime: '16:00',
    dpsLocationId: 'bf93cc33-49ed-4a7b-af92-05183d6428cc',
    availableVideoSessions: 0,
    availableAdults: 997,
    availableGroups: 998,
    locationDescription: 'Official Visits',
  },
  locationDescription: 'Official Visits',
  officialVisitors: [
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
      assistanceNotes: 'Assistance details',
      assistedVisit: true,
      equipmentNotes: 'Equipment details',
      equipment: true,
      isApprovedVisitor: true,
      isNextOfKin: false,
      isEmergencyContact: false,
      isRelationshipActive: true,
      restrictionSummary: {
        active: [
          {
            restrictionType: 'CCTV',
            restrictionTypeDescription: 'CCTV monitoring required',
            startDate: '2024-01-01',
            expiryDate: '2025-12-31',
          },
        ],
      },
    },
  ],
  socialVisitors: [],
  assistancePageCompleted: true,
  equipmentPageCompleted: true,
  prisonerNotes: 'prisoner notes',
  staffNotes: 'staff notes',
  commentsPageCompleted: true,
} as unknown as Partial<OfficialVisitJourney>

const defaultJourneySession = () => ({
  officialVisit: mockOfficialVisitJourney,
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
  officialVisitsService.createVisit.mockResolvedValue({
    officialVisitId: 1,
    visitorAndContactIds: [],
    prisonerNumber: 'G4793VF',
  })
  officialVisitsService.getAvailableSlots.mockResolvedValue([
    mockOfficialVisitJourney.selectedTimeSlot as AvailableSlot,
  ])
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/check-your-answers`

describe('check your answers handler', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = getPageHeader($)

          expect(heading).toEqual('Check and confirm the official visit details')
          expect($('h2.govuk-heading-l').text()).toEqual('Visit detailsVisitor details')

          // Check restrictions badge is rendered correctly (1 restriction = singular)
          expect(res.text).toContain('ACTIVE RESTRICTION IN PLACE')

          // Check restrictions table is rendered correctly
          expect(res.text).toContain('active restrictions')
          expect(res.text).toContain('Previous info')
          expect(res.text).toContain('2 October 2024')
          expect(res.text).toContain('Type of restriction')
          expect(res.text).toContain('Comments')
          expect(res.text).toContain('Date from')
          expect(res.text).toContain('Date to')

          expect(getValueByKey($, 'Prisoner')).toEqual('Tim Harrison (G4793VF)')
          expect(getValueByKey($, 'Visit type')).toEqual('Attend in person')
          expect(getValueByKey($, 'Date')).toEqual('Monday, 26 January 2026')
          expect(getValueByKey($, 'Time')).toEqual('1:30pm to 4pm (2 hours 30 minutes)')
          expect(getValueByKey($, 'Location')).toEqual('Official Visits')
          expect(getValueByKey($, 'Prisoner notes')).toEqual('prisoner notes')
          expect(getValueByKey($, 'Staff notes')).toEqual('staff notes')

          expect($('h3').text()).toEqual('Peter Malicious (Solicitor)')

          expect(getValueByKey($, 'Contact type')).toEqual('Official')
          expect(getValueByKey($, 'Does this visitor need assistance?')).toEqual('Yes')
          expect(getValueByKey($, 'Assistance details')).toEqual('Assistance details')
          expect(getValueByKey($, 'Does this visitor need equipment?')).toEqual('Yes')
          expect(getValueByKey($, 'Equipment')).toEqual('Equipment details')

          // Check visitor restrictions are displayed
          expect(res.text).toContain('Restrictions')
          expect(res.text).toContain('CCTV monitoring required')

          expect($('.govuk-button').text().trim()).toEqual('Create official visit')

          expect(auditService.logPageView).toHaveBeenCalledWith(Page.CHECK_YOUR_ANSWERS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should render ACTIVE RESTRICTIONS IN PLACE badge when multiple restrictions exist', () => {
      // Create a mock with multiple restrictions
      const mockJourneyWithMultipleRestrictions = {
        ...mockOfficialVisitJourney,
        prisoner: {
          ...mockOfficialVisitJourney.prisoner,
          restrictions: [
            {
              prisonerRestrictionId: 175317,
              prisonerNumber: 'G4793VF',
              restrictionType: 'PREINF',
              restrictionTypeDescription: 'Previous info',
              effectiveDate: '2024-10-02',
              authorisedUsername: 'JDIMBLEBY_GEN',
              authorisedByDisplayName: 'Jo Dimbleby',
              currentTerm: true,
              createdBy: 'JDIMBLEBY_GEN',
              createdTime: '2024-10-02T11:58:01.285998',
            },
            {
              prisonerRestrictionId: 175318,
              prisonerNumber: 'G4793VF',
              restrictionType: 'CCTV',
              restrictionTypeDescription: 'CCTV monitoring required',
              effectiveDate: '2024-10-01',
              authorisedUsername: 'JDIMBLEBY_GEN',
              authorisedByDisplayName: 'Jo Dimbleby',
              currentTerm: true,
              createdBy: 'JDIMBLEBY_GEN',
              createdTime: '2024-10-01T11:58:01.285998',
            },
          ],
        },
      }

      const journeyWithMultipleRestrictions = () => ({
        officialVisit: mockJourneyWithMultipleRestrictions,
      })

      appSetup(journeyWithMultipleRestrictions())

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).toContain('ACTIVE RESTRICTIONS IN PLACE')
          expect(res.text).toContain('moj-badge--red')
        })
    })

    it('should not render badge when no active restrictions exist', () => {
      const mockJourneyWithExpiredRestrictions = {
        ...mockOfficialVisitJourney,
        prisoner: {
          ...mockOfficialVisitJourney.prisoner,
          restrictions: [
            {
              prisonerRestrictionId: 175317,
              prisonerNumber: 'G4793VF',
              restrictionType: 'PREINF',
              restrictionTypeDescription: 'Previous info',
              effectiveDate: '2020-10-02', // Expired
              expiryDate: '2021-10-02', // Expired
              authorisedUsername: 'JDIMBLEBY_GEN',
              authorisedByDisplayName: 'Jo Dimbleby',
              currentTerm: true,
              createdBy: 'JDIMBLEBY_GEN',
              createdTime: '2020-10-02T11:58:01.285998',
            },
          ],
        },
      }

      const journeyWithExpiredRestrictions = () => ({
        officialVisit: mockJourneyWithExpiredRestrictions,
      })

      appSetup(journeyWithExpiredRestrictions())

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          expect(res.text).not.toContain('ACTIVE RESTRICTION IN PLACE')
          expect(res.text).not.toContain('ACTIVE RESTRICTIONS IN PLACE')
          expect(res.text).not.toContain('moj-badge--red')
        })
    })

    it('should display "None" for visitor with no restrictions', () => {
      // Create a mock with visitor having no restrictions
      const mockJourneyWithNoVisitorRestrictions = {
        ...mockOfficialVisitJourney,
        officialVisitors: [
          {
            ...mockOfficialVisitJourney.officialVisitors[0],
            restrictionSummary: {
              active: [] as RestrictionSummary[],
            },
          },
        ],
      }

      const journeyWithNoVisitorRestrictions = () => ({
        officialVisit: mockJourneyWithNoVisitorRestrictions as unknown as Partial<OfficialVisitJourney>,
      })

      appSetup(journeyWithNoVisitorRestrictions())

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          // Check visitor restrictions show "None"
          expect(res.text).toContain('Restrictions')
          expect(res.text).toContain('None')
          expect(res.text).not.toContain('CCTV monitoring required')
        })
    })
  })

  describe('POST', () => {
    it('should allow empty submission and redirect to confirmation page when visit type is IN_PERSON', async () => {
      await request(app).post(URL).send().expect(302).expect('location', 'confirmation/1')

      expect(officialVisitsService.createVisit.mock.calls[0][0]).toEqual(mockOfficialVisitJourney)
    })

    it('should show capacity error when slot is no longer available', async () => {
      officialVisitsService.getAvailableSlots.mockResolvedValue([])

      await request(app)
        .post(URL)
        .send()
        .expect(200)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('.moj-alert--warning').length).toBe(1)
          expect($('.moj-alert__heading').text()).toContain('Capacity for visit slot selected is exceeded')
          expect($('.moj-alert__content').text()).toContain('The visit slot has exceeded maximum visitor capacity')
          expect($('.moj-alert__content a').text()).toContain('Choose another time slot')
          expect($('.moj-alert__content a').attr('href')).toBe('time-slot')
        })

      expect(officialVisitsService.createVisit).not.toHaveBeenCalled()
    })

    it('should show capacity error when too many visitors for in-person visit', async () => {
      const slotWithLimitedCapacity = {
        ...mockOfficialVisitJourney.selectedTimeSlot,
        availableAdults: 1,
        availableGroups: 5,
      }
      officialVisitsService.getAvailableSlots.mockResolvedValue([slotWithLimitedCapacity as AvailableSlot])

      const journeyWithTwoVisitors = {
        ...mockOfficialVisitJourney,
        socialVisitors: [
          {
            prisonerContactId: 7332365,
            contactId: 20085648,
            prisonerNumber: 'G4793VF',
            lastName: 'Second',
            firstName: 'Visitor',
            relationshipTypeCode: 'S',
            relationshipTypeDescription: 'Social',
            relationshipToPrisonerCode: 'FRI',
            relationshipToPrisonerDescription: 'Friend',
            assistanceNotes: '',
            assistedVisit: false,
            equipmentNotes: '',
            equipment: false,
          },
        ],
      } as OfficialVisitJourney

      appSetup({ officialVisit: journeyWithTwoVisitors })

      await request(app)
        .post(URL)
        .send()
        .expect(200)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('.moj-alert--warning').length).toBe(1)
          expect($('.moj-alert__heading').text()).toContain('Capacity for visit slot selected is exceeded')
          expect($('.moj-alert__content').text()).toContain('The visit slot has exceeded maximum visitor capacity')
          expect($('.moj-alert__content a').text()).toContain('Choose another time slot')
          expect($('.moj-alert__content a').attr('href')).toBe('time-slot')
        })

      expect(officialVisitsService.createVisit).not.toHaveBeenCalled()
    })

    it('should show capacity error when video visit has no capacity', async () => {
      const videoVisitJourney = {
        ...mockOfficialVisitJourney,
        visitType: 'VIDEO',
        visitTypeDescription: 'Video visit',
      } as OfficialVisitJourney

      const slotWithNoVideoCapacity = {
        ...mockOfficialVisitJourney.selectedTimeSlot,
        availableVideoSessions: 0,
      }
      officialVisitsService.getAvailableSlots.mockResolvedValue([slotWithNoVideoCapacity as AvailableSlot])

      appSetup({ officialVisit: videoVisitJourney })

      await request(app)
        .post(URL)
        .send()
        .expect(200)
        .expect(res => {
          const $ = cheerio.load(res.text)
          expect($('.moj-alert--warning').length).toBe(1)
          expect($('.moj-alert__heading').text()).toContain('Capacity for visit slot selected is exceeded')
          expect($('.moj-alert__content').text()).toContain('The visit slot has exceeded maximum visitor capacity')
          expect($('.moj-alert__content a').text()).toContain('Choose another time slot')
          expect($('.moj-alert__content a').attr('href')).toBe('time-slot')
        })

      expect(officialVisitsService.createVisit).not.toHaveBeenCalled()
    })
  })
})
