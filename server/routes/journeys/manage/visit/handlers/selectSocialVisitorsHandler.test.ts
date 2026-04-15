import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { appWithAllRoutes, journeyId, user } from '../../../../testutils/appSetup'
import AuditService, { Page } from '../../../../../services/auditService'
import PrisonerService from '../../../../../services/prisonerService'
import OfficialVisitsService from '../../../../../services/officialVisitsService'
import {
  getPageHeader,
  getProgressTrackerLabels,
  getProgressTrackerItems,
  getProgressTrackerCompleted,
  getByDataQa,
} from '../../../../testutils/cheerio'
import { Journey } from '../../../../../@types/express'
import { JourneyVisitor, OfficialVisitJourney } from '../journey'
import { getJourneySession } from '../../../../testutils/testUtilRoute'
import { mockSocialVisitors, mockPrisonerRestrictions, mockPrisoner } from '../../../../../testutils/mocks'
import { expectNoErrorMessages, expectAlertErrors } from '../../../../testutils/expectErrorMessage'
import { convertToTitleCase, formatDate } from '../../../../../utils/utils'
import config from '../../../../../config'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

const appSetup = (
  journeySession = {
    officialVisit: {
      prisoner: {
        ...mockPrisoner,
        restrictions: mockPrisonerRestrictions,
      },
      availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
      selectedTimeSlot: {
        timeSlotId: 1,
        visitSlotId: 1,
        visitDate: '2037-01-26',
        startTime: '13:30',
        endTime: '16:00',
        availableVideoSessions: 2,
        availableAdults: 3,
        availableGroups: 2,
      },
      visitType: 'IN_PERSON',
    } as OfficialVisitJourney,
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
  officialVisitsService.getAllSocialContacts.mockResolvedValue(mockSocialVisitors)
  officialVisitsService.getAvailableSlots.mockResolvedValue([
    {
      timeSlotId: 1,
      visitSlotId: 1,
      prisonCode: 'MDI',
      dayCode: 'MON',
      dayDescription: 'Monday',
      visitDate: '2037-01-26',
      startTime: '13:30',
      endTime: '16:00',
      dpsLocationId: 'loc1',
      availableVideoSessions: 2,
      availableAdults: 3,
      availableGroups: 2,
    },
  ])
  officialVisitsService.checkForOverlappingVisits.mockResolvedValue({
    prisonerNumber: 'G4793VF',
    overlappingPrisonerVisits: [],
    contacts: [],
  })
})

afterEach(() => {
  jest.resetAllMocks()
  config.featureToggles.allowSocialVisitorsPrisons = 'MDI'
})

const URL = `/manage/create/${journeyId()}/select-social-visitors`

describe('Select social visitors', () => {
  describe('GET (create)', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          // Check we have completed step 2/6 on the progress tracker
          expect(getProgressTrackerCompleted($)).toHaveLength(2)
          expect(getProgressTrackerItems($)).toHaveLength(5)

          // Displaying the right progress bar labels and sequence
          const labels = getProgressTrackerLabels($)
          expect(labels.eq(0).text().trim()).toContain('Who is attending')
          expect(labels.eq(1).text().trim()).toContain('Visit time and place')
          expect(labels.eq(2).text().trim()).toContain('Visit type and visitors')
          expect(labels.eq(3).text().trim()).toContain('Optional information')
          expect(labels.eq(4).text().trim()).toContain('Review and confirm')

          // Check the prisoner mini-profile is present with correct prisoner details
          expect(getByDataQa($, 'mini-profile-person-profile-link').text().trim()).toEqual(
            convertToTitleCase(`${mockPrisoner.lastName}, ${mockPrisoner.firstName}`),
          )
          expect(getByDataQa($, 'mini-profile-prisoner-number').text().trim()).toEqual(mockPrisoner.prisonerNumber)
          expect(getByDataQa($, 'mini-profile-dob').text().trim()).toEqual('1 June 1989')
          expect(getByDataQa($, 'mini-profile-cell-location').text().trim()).toEqual(mockPrisoner.cellLocation)
          expect(getByDataQa($, 'mini-profile-prison-name').text().trim()).toEqual(mockPrisoner.prisonName)

          // Check page header
          const heading = getPageHeader($)
          expect($('.govuk-hint').text()).toEqual('Schedule an official visit')
          expect(heading).toEqual("Select social visitors from the prisoner's approved contact list (optional)")

          // Prisoner restrictions table
          const restrictionHeaders = getByDataQa($, 'prisoner-restrictions-table').find('thead > tr > th')
          expect(restrictionHeaders.eq(0).text().trim()).toEqual('Type of restriction')
          expect(restrictionHeaders.eq(1).text().trim()).toEqual('Comments')
          expect(restrictionHeaders.eq(2).text().trim()).toEqual('Date from')
          expect(restrictionHeaders.eq(3).text().trim()).toEqual('Date to')

          // Prisoner restriction rows
          const restrictionRows = getByDataQa($, 'prisoner-restrictions-table').find('tbody > tr > td')
          // Row 1
          expect(restrictionRows.eq(0).text().trim()).toEqual(mockPrisonerRestrictions[0].commentText)
          expect(restrictionRows.eq(1).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[0].effectiveDate))
          expect(restrictionRows.eq(2).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[0].expiryDate))
          // Row 2
          expect(restrictionRows.eq(3).text().trim()).toEqual(mockPrisonerRestrictions[1].commentText)
          expect(restrictionRows.eq(4).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[1].effectiveDate))
          expect(restrictionRows.eq(5).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[1].expiryDate))
          /// Row 3
          expect(restrictionRows.eq(6).text().trim()).toEqual(mockPrisonerRestrictions[2].commentText)
          expect(restrictionRows.eq(7).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[2].effectiveDate))
          expect(restrictionRows.eq(8).text().trim()).toEqual('Not entered')

          // Social visitor table
          const visitorHeaders = getByDataQa($, 'visitors-table').find('thead > tr > th')
          expect(visitorHeaders.eq(0).text().trim()).toEqual('Add')
          expect(visitorHeaders.eq(1).text().trim()).toEqual('Name')
          expect(visitorHeaders.eq(2).text().trim()).toEqual('Date of birth')
          expect(visitorHeaders.eq(3).text().trim()).toEqual('Relationship')
          expect(visitorHeaders.eq(4).text().trim()).toEqual('Address')
          expect(visitorHeaders.eq(5).text().trim()).toEqual('Active restrictions')

          const visitorRows = getByDataQa($, 'visitors-table').find('tbody > tr > td')
          // Row 1
          expect(visitorRows.eq(0).text().trim()).toContain(
            `${mockSocialVisitors[0].firstName} ${mockSocialVisitors[0].lastName}`,
          )
          expect(visitorRows.eq(1).text().trim()).toEqual(formatDate(mockSocialVisitors[0].dateOfBirth))
          expect(visitorRows.eq(2).text().trim()).toEqual(mockSocialVisitors[0].relationshipToPrisonerDescription)
          expect(visitorRows.eq(3).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(4).text().trim()).toBeDefined() // Restrictions
          // Row 2
          expect(visitorRows.eq(5).text().trim()).toContain(
            `${mockSocialVisitors[1].firstName} ${mockSocialVisitors[1].lastName}`,
          )
          expect(visitorRows.eq(6).text().trim()).toEqual(formatDate(mockSocialVisitors[1].dateOfBirth))
          expect(visitorRows.eq(7).text().trim()).toEqual(mockSocialVisitors[1].relationshipToPrisonerDescription)
          expect(visitorRows.eq(8).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(9).text().trim()).toBeDefined() // Restrictions
          // contact link displayed only for contacts authorizer role
          expect(getByDataQa($, 'contacts-link').length).toEqual(1)

          expect($('.govuk-back-link').attr('href')).toEqual(`select-official-visitors`)
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to homepage')
          expect($('.govuk-link').last().attr('href')).toContain(`cancellation-check?stepsChecked=2`)

          // Calls expected
          expect(officialVisitsService.getAllSocialContacts).toHaveBeenCalledWith(
            mockPrisoner.prisonerNumber,
            user,
            undefined,
            true,
          )
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.SELECT_SOCIAL_VISITORS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should not show inset text or MOJ badges when visit is in the past', () => {
      appSetup({
        officialVisit: {
          prisoner: {
            ...mockPrisoner,
            restrictions: mockPrisonerRestrictions,
          },
          prisonCode: 'MDI',
          availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
          selectedTimeSlot: {
            timeSlotId: 1,
            visitSlotId: 1,
            visitDate: '2020-01-01',
            startTime: '13:30',
            endTime: '16:00',
            availableVideoSessions: 2,
            availableAdults: 3,
            availableGroups: 2,
          },
          visitType: 'IN_PERSON',
        } as OfficialVisitJourney,
      })

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          // Should not show inset text or badges for past visits
          expect(res.text).not.toContain('Some visitor details need updating')
          expect(res.text).not.toContain('CONTACT NOT APPROVED')
          expect(res.text).not.toContain('NO RECORDED RELATIONSHIP')
        })
    })
  })

  describe('GET (amend)', () => {
    it('should render the correct view page with badges and inset text for visitors with issues', () => {
      // Set up a visitor with no relationship (not in API response)
      const visitorWithNoRelationship = {
        prisonerContactId: 999,
        contactId: 999,
        prisonerNumber: 'A1337AA',
        lastName: 'Visitor',
        firstName: 'Unknown',
        relationshipTypeCode: 'S',
        relationshipTypeDescription: 'Social',
        relationshipToPrisonerCode: 'UNK',
        relationshipToPrisonerDescription: 'Unknown',
        isApprovedVisitor: false,
        isNextOfKin: false,
        isEmergencyContact: false,
        isRelationshipActive: true,
        currentTerm: true,
        isStaff: false,
        restrictionSummary: mockSocialVisitors[0].restrictionSummary,
      }

      // Set up a not approved visitor (in API response but not approved)
      const notApprovedVisitor = {
        ...mockSocialVisitors[2],
        prisonerContactId: 204,
        contactId: 204,
        relationshipToPrisonerCode: 'FRI',
        relationshipToPrisonerDescription: 'Friend',
        isApprovedVisitor: false,
      }

      appSetup({
        officialVisit: {
          prisoner: {
            ...mockPrisoner,
            restrictions: mockPrisonerRestrictions,
          },
          prisonCode: 'MDI',
          availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
          selectedTimeSlot: {
            timeSlotId: 1,
            visitSlotId: 1,
            visitDate: '2037-01-26',
            startTime: '13:30',
            endTime: '16:00',
            availableVideoSessions: 2,
            availableAdults: 3,
            availableGroups: 2,
          },
          officialVisitors: [],
          socialVisitors: [visitorWithNoRelationship],
        } as OfficialVisitJourney,
      })

      // Disable social visitors for the prison to trigger social visitor badge (must be after appSetup)
      config.featureToggles.allowSocialVisitorsPrisons = ''

      // Mock API returns normal visitors + not approved visitor
      officialVisitsService.getAllSocialContacts.mockResolvedValue([
        mockSocialVisitors[0],
        mockSocialVisitors[1],
        notApprovedVisitor,
      ])

      return request(app)
        .get(`/manage/amend/1/${journeyId()}/select-social-visitors`)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          // There should not be a progress tracker on this page
          expect($('.moj-progress-bar').length).toBeFalsy()

          // Check the prisoner mini-profile is present with correct prisoner details
          expect(getByDataQa($, 'mini-profile-person-profile-link').text().trim()).toEqual(
            convertToTitleCase(`${mockPrisoner.lastName}, ${mockPrisoner.firstName}`),
          )
          expect(getByDataQa($, 'mini-profile-prisoner-number').text().trim()).toEqual(mockPrisoner.prisonerNumber)
          expect(getByDataQa($, 'mini-profile-dob').text().trim()).toEqual('1 June 1989')
          expect(getByDataQa($, 'mini-profile-cell-location').text().trim()).toEqual(mockPrisoner.cellLocation)
          expect(getByDataQa($, 'mini-profile-prison-name').text().trim()).toEqual(mockPrisoner.prisonName)

          // Check page header
          const heading = getPageHeader($)
          expect($('.govuk-hint').text()).toEqual('Amend an official visit')
          expect(heading).toEqual("Select social visitors from the prisoner's approved contact list (optional)")

          // Check inset text is displayed with bullet points for social visitor and not approved
          expect(res.text).toContain('Some visitor details need updating')
          expect(res.text).toContain('is a social visitor for a prison where this is not enabled')
          expect(res.text).toContain('is not an approved contact')

          // Check MOJ badges are displayed for SOCIAL VISITOR and CONTACT NOT APPROVED
          expect(res.text).toContain('SOCIAL VISITOR')
          expect(res.text).toContain('CONTACT NOT APPROVED')
          expect(res.text).toContain('moj-badge--red')

          // Prisoner restrictions table
          const restrictionHeaders = getByDataQa($, 'prisoner-restrictions-table').find('thead > tr > th')
          expect(restrictionHeaders.eq(0).text().trim()).toEqual('Type of restriction')
          expect(restrictionHeaders.eq(1).text().trim()).toEqual('Comments')
          expect(restrictionHeaders.eq(2).text().trim()).toEqual('Date from')
          expect(restrictionHeaders.eq(3).text().trim()).toEqual('Date to')

          // Prisoner restriction rows
          const restrictionRows = getByDataQa($, 'prisoner-restrictions-table').find('tbody > tr > td')
          // Row 1
          expect(restrictionRows.eq(0).text().trim()).toEqual(mockPrisonerRestrictions[0].commentText)
          expect(restrictionRows.eq(1).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[0].effectiveDate))
          expect(restrictionRows.eq(2).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[0].expiryDate))
          // Row 2
          expect(restrictionRows.eq(3).text().trim()).toEqual(mockPrisonerRestrictions[1].commentText)
          expect(restrictionRows.eq(4).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[1].effectiveDate))
          expect(restrictionRows.eq(5).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[1].expiryDate))
          /// Row 3
          expect(restrictionRows.eq(6).text().trim()).toEqual(mockPrisonerRestrictions[2].commentText)
          expect(restrictionRows.eq(7).text().trim()).toEqual(formatDate(mockPrisonerRestrictions[2].effectiveDate))
          expect(restrictionRows.eq(8).text().trim()).toEqual('Not entered')

          // Social visitor table
          const visitorHeaders = getByDataQa($, 'visitors-table').find('thead > tr > th')
          expect(visitorHeaders.eq(0).text().trim()).toEqual('Add')
          expect(visitorHeaders.eq(1).text().trim()).toEqual('Name')
          expect(visitorHeaders.eq(2).text().trim()).toEqual('Date of birth')
          expect(visitorHeaders.eq(3).text().trim()).toEqual('Relationship')
          expect(visitorHeaders.eq(4).text().trim()).toEqual('Address')
          expect(visitorHeaders.eq(5).text().trim()).toEqual('Active restrictions')

          const visitorRows = getByDataQa($, 'visitors-table').find('tbody > tr > td')
          // Row 1
          expect(visitorRows.eq(0).text().trim()).toContain(
            `${mockSocialVisitors[0].firstName} ${mockSocialVisitors[0].lastName}`,
          )
          expect(visitorRows.eq(1).text().trim()).toEqual(formatDate(mockSocialVisitors[0].dateOfBirth))
          expect(visitorRows.eq(2).text().trim()).toEqual(mockSocialVisitors[0].relationshipToPrisonerDescription)
          expect(visitorRows.eq(3).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(4).text().trim()).toBeDefined() // Restrictions
          // Row 2
          expect(visitorRows.eq(5).text().trim()).toContain(
            `${mockSocialVisitors[1].firstName} ${mockSocialVisitors[1].lastName}`,
          )
          expect(visitorRows.eq(6).text().trim()).toEqual(formatDate(mockSocialVisitors[1].dateOfBirth))
          expect(visitorRows.eq(7).text().trim()).toEqual(mockSocialVisitors[1].relationshipToPrisonerDescription)
          expect(visitorRows.eq(8).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(9).text().trim()).toBeDefined() // Restrictions
          // contact link displayed only for contacts authorizer role
          expect(getByDataQa($, 'contacts-link').length).toEqual(1)

          expect($('.govuk-back-link').attr('href')).toEqual(`select-official-visitors`)
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to visit details')
          expect($('.govuk-link').last().attr('href')).toContain(`./`)

          // Calls expected
          expect(officialVisitsService.getAllSocialContacts).toHaveBeenCalledWith(
            mockPrisoner.prisonerNumber,
            user,
            undefined,
            true,
          )
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.SELECT_SOCIAL_VISITORS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should allow no social visitors to be selected', () => {
      return request(app)
        .post(URL)
        .send({})
        .expect(302)
        .expect('location', 'assistance-required')
        .expect(() => expectNoErrorMessages())
    })

    it('should accept the selection of one social visitor', async () => {
      await request(app)
        .post(URL)
        .send({ selected: ['201-BRO'] })
        .expect(302)
        .expect('location', 'assistance-required')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.socialVisitors).toHaveLength(1)
      const visitor = journeySession.socialVisitors[0]
      expect(visitor.contactId).toBe(201)
      expect(visitor.relationshipToPrisonerCode).toBe('BRO')
      expect(visitor.firstName).toBe('Abe')
      expect(visitor.lastName).toBe('Smith')
    })

    it('should accept the selection of two social visitors', async () => {
      await request(app)
        .post(URL)
        .send({ selected: ['201-BRO', '202-BRO'] })
        .expect(302)
        .expect('location', 'assistance-required')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.socialVisitors).toHaveLength(2)
    })

    it('should accept the selection of two social visitors (amend)', async () => {
      await request(app)
        .post(`/manage/amend/1/${journeyId()}/select-social-visitors`)
        .send({ selected: ['201-BRO', '202-BRO'] })
        .expect(302)
        .expect('location', 'assistance-required')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.socialVisitors).toHaveLength(2)
    })

    it('should handle visitors with same contact ID but different relationship codes', async () => {
      const mockVisitorsWithSameContactId = [
        ...mockSocialVisitors,
        {
          ...mockSocialVisitors[0],
          relationshipToPrisonerCode: 'FRI',
          relationshipToPrisonerDescription: 'Friend',
        },
      ]
      officialVisitsService.getAllSocialContacts.mockResolvedValue(mockVisitorsWithSameContactId)

      await request(app)
        .post(URL)
        .set('Referer', URL)
        .send({ selected: ['201-BRO', '201-FRI'] })
        .expect(302)
        .expect('location', URL)
        .expect(() =>
          expectAlertErrors({
            hasDuplicateContactIds: true,
          }),
        )

      // Verify the visitors are saved to session but validation error prevents progression
      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.socialVisitors).toHaveLength(2)

      // Verify both visitors have the same contact ID but different relationship codes
      const visitors = journeySession.socialVisitors
      const brotherVisitor = visitors.find((v: JourneyVisitor) => v.relationshipToPrisonerCode === 'BRO')
      const friendVisitor = visitors.find((v: JourneyVisitor) => v.relationshipToPrisonerCode === 'FRI')

      expect(brotherVisitor).toBeDefined()
      expect(brotherVisitor.contactId).toBe(201)
      expect(brotherVisitor.relationshipToPrisonerCode).toBe('BRO')

      expect(friendVisitor).toBeDefined()
      expect(friendVisitor.contactId).toBe(201)
      expect(friendVisitor.relationshipToPrisonerCode).toBe('FRI')
    })

    it('should show alert error when selecting visitor with no relationship', async () => {
      // Visitor in session but not in API response (no relationship)
      const journeyVisitorWithNoRelationship = {
        prisonerContactId: 999,
        contactId: 999,
        prisonerNumber: 'A1337AA',
        lastName: 'Visitor',
        firstName: 'Unknown',
        relationshipTypeCode: 'S',
        relationshipTypeDescription: 'Social',
        relationshipToPrisonerCode: 'UNK',
        relationshipToPrisonerDescription: 'Unknown',
        isApprovedVisitor: false,
        isNextOfKin: false,
        isEmergencyContact: false,
        isRelationshipActive: true,
        currentTerm: true,
        isStaff: false,
        restrictionSummary: mockSocialVisitors[0].restrictionSummary,
      }

      // Set up journey with the visitor who has no relationship
      appSetup({
        officialVisit: {
          prisoner: {
            ...mockPrisoner,
            restrictions: mockPrisonerRestrictions,
          },
          prisonCode: 'MDI',
          availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
          selectedTimeSlot: {
            timeSlotId: 1,
            visitSlotId: 1,
            visitDate: '2037-01-26',
            startTime: '13:30',
            endTime: '16:00',
            availableVideoSessions: 2,
            availableAdults: 3,
            availableGroups: 2,
          },
          socialVisitors: [journeyVisitorWithNoRelationship],
          visitType: 'IN_PERSON',
        } as OfficialVisitJourney,
      })

      // Mock API to return only standard visitors (not the journey visitor with no relationship)
      officialVisitsService.getAllSocialContacts.mockResolvedValue(mockSocialVisitors)

      await request(app)
        .post(URL)
        .set('Referer', URL)
        .send({ selected: ['999-UNK'] })
        .expect(302)
        .expect('location', URL)
        .expect(() =>
          expectAlertErrors({
            noRelationship: true,
          }),
        )
    })

    it('should allow progression when selected visitor is not approved but has relationship', async () => {
      // Visitor from API that is not approved - should be allowed but with warning
      const mockNotApprovedVisitor = {
        ...mockSocialVisitors[0],
        contactId: 204,
        prisonerContactId: 4,
        relationshipToPrisonerCode: 'FRI',
        relationshipToPrisonerDescription: 'Friend',
        isApprovedVisitor: false,
      }

      officialVisitsService.getAllSocialContacts.mockResolvedValue([...mockSocialVisitors, mockNotApprovedVisitor])

      await request(app)
        .post(URL)
        .send({ selected: ['204-FRI'] })
        .expect(302)
        .expect('location', 'assistance-required')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.socialVisitors).toHaveLength(1)
      expect(journeySession.socialVisitors[0].contactId).toBe(204)
    })
  })
})
