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
import { getJourneySession } from '../../../../testutils/testUtilRoute'
import { mockOfficialVisitors, mockPrisonerRestrictions, mockPrisoner } from '../../../../../testutils/mocks'
import { expectErrorMessages, expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
import { convertToTitleCase, formatDate } from '../../../../../utils/utils'
import config from '../../../../../config'
import { JourneyVisitor, OfficialVisitJourney } from '../journey'

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
      prisonCode: 'MDI',
      availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
      selectedTimeSlot: {
        timeSlotId: 1,
        visitSlotId: 1,
        visitDate: '2026-01-26',
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
  config.featureToggles.allowSocialVisitorsPrisons = 'MDI'
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
  appSetup()
  officialVisitsService.getAllOfficialContacts.mockResolvedValue(mockOfficialVisitors)
  officialVisitsService.getAvailableSlots.mockResolvedValue([
    {
      timeSlotId: 1,
      visitSlotId: 1,
      prisonCode: 'MDI',
      dayCode: 'MON',
      dayDescription: 'Monday',
      visitDate: '2026-01-26',
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
})

const URL = `/manage/create/${journeyId()}/select-official-visitors`

describe('Select official visitors', () => {
  describe('GET (create)', () => {
    it('should render the correct view page with restrictions and contacts', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          // Check we have completed step 2/5 on the progress tracker
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
          expect(heading).toEqual("Select official visitors from the prisoner's approved contact list")

          // Prisoner restrictions table
          const restrictionHeaders = getByDataQa($, 'prisoner-restrictions-table').find('thead > tr > th')
          expect(restrictionHeaders.eq(0).text().trim()).toEqual('Type of restriction')
          expect(restrictionHeaders.eq(1).text().trim()).toEqual('Comments')
          expect(restrictionHeaders.eq(2).text().trim()).toEqual('Date from')
          expect(restrictionHeaders.eq(3).text().trim()).toEqual('Date to')

          // Prisoner restrictions rows
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

          // Official visitor table
          const visitorHeaders = getByDataQa($, 'visitors-table').find('thead > tr > th')
          expect(visitorHeaders.eq(0).text().trim()).toEqual('Add')
          expect(visitorHeaders.eq(1).text().trim()).toEqual('Name')
          expect(visitorHeaders.eq(2).text().trim()).toEqual('Age')
          expect(visitorHeaders.eq(3).text().trim()).toEqual('Relationship')
          expect(visitorHeaders.eq(4).text().trim()).toEqual('Address')
          expect(visitorHeaders.eq(5).text().trim()).toEqual('Active restrictions')

          const visitorRows = getByDataQa($, 'visitors-table').find('tbody > tr > td')
          // Row 1
          expect(visitorRows.eq(0).text().trim()).toEqual(
            `${mockOfficialVisitors[0].firstName} ${mockOfficialVisitors[0].lastName}`,
          )
          expect(visitorRows.eq(1).text().trim()).toEqual('Over 18')
          expect(visitorRows.eq(2).text().trim()).toEqual(mockOfficialVisitors[0].relationshipToPrisonerDescription)
          expect(visitorRows.eq(3).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(4).text().trim()).toBeDefined() // Restrictions
          // Row 2
          expect(visitorRows.eq(5).text().trim()).toEqual(
            `${mockOfficialVisitors[1].firstName} ${mockOfficialVisitors[1].lastName}`,
          )
          expect(visitorRows.eq(6).text().trim()).toEqual('Over 18')
          expect(visitorRows.eq(7).text().trim()).toEqual(mockOfficialVisitors[1].relationshipToPrisonerDescription)
          expect(visitorRows.eq(8).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(9).text().trim()).toBeDefined() // Restrictions

          expect($('.govuk-back-link').attr('href')).toEqual(`time-slot?date=2026-01-26`)
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to homepage')
          expect($('.govuk-link').last().attr('href')).toContain(`cancellation-check?stepsChecked=2`)

          // Calls expected
          expect(officialVisitsService.getAllOfficialContacts).toHaveBeenCalledWith(
            mockPrisoner.prisonerNumber,
            user,
            undefined,
            true,
          )
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.SELECT_OFFICIAL_VISITORS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should render the correct view page with no restrictions or contacts', () => {
      // No contacts or restrictions
      appSetup({
        officialVisit: {
          prisoner: {
            ...mockPrisoner,
            restrictions: [],
          },
          prisonCode: 'MDI',
          availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
        } as OfficialVisitJourney,
      })

      officialVisitsService.getAllOfficialContacts.mockResolvedValue([])

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          // Check we have completed step 2/6 on the progress tracker
          expect(getProgressTrackerCompleted($)).toHaveLength(2)
          expect(getProgressTrackerItems($)).toHaveLength(5)

          const heading = getPageHeader($)
          expect(heading).toEqual("Select official visitors from the prisoner's approved contact list")

          // Prisoner restrictions - empty
          expect(getByDataQa($, 'empty-restrictions-title').text().trim()).toContain('active restrictions')
          expect(getByDataQa($, 'empty-restrictions-message').text().trim()).toEqual('No active restrictions')

          // Prisoner contacts - empty content
          expect(getByDataQa($, 'empty-contacts-title').text().trim()).toEqual('Approved official contacts')
          expect(getByDataQa($, 'empty-contacts-message').text().trim()).toEqual('No approved official contacts')
          // contact link displayed only for contacts authorizer role
          expect(getByDataQa($, 'contacts-link').length).toEqual(1)

          // Calls expected
          expect(officialVisitsService.getAllOfficialContacts).toHaveBeenCalledWith(
            mockPrisoner.prisonerNumber,
            user,
            undefined,
            true,
          )
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.SELECT_OFFICIAL_VISITORS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('GET (amend)', () => {
    it('should render the correct view page with restrictions and contacts', () => {
      appSetup({
        officialVisit: {
          prisoner: {
            ...mockPrisoner,
            restrictions: mockPrisonerRestrictions,
          },
          prisonCode: 'MDI',
          availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
          officialVisitors: [],
          socialVisitors: [],
        } as OfficialVisitJourney,
      })
      return request(app)
        .get(`/manage/amend/1/${journeyId()}/select-official-visitors?change=true`)
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
          expect(heading).toEqual("Select official visitors from the prisoner's approved contact list")

          // Prisoner restrictions table
          const restrictionHeaders = getByDataQa($, 'prisoner-restrictions-table').find('thead > tr > th')
          expect(restrictionHeaders.eq(0).text().trim()).toEqual('Type of restriction')
          expect(restrictionHeaders.eq(1).text().trim()).toEqual('Comments')
          expect(restrictionHeaders.eq(2).text().trim()).toEqual('Date from')
          expect(restrictionHeaders.eq(3).text().trim()).toEqual('Date to')

          // Prisoner restrictions rows
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

          // Official visitor table
          const visitorHeaders = getByDataQa($, 'visitors-table').find('thead > tr > th')
          expect(visitorHeaders.eq(0).text().trim()).toEqual('Add')
          expect(visitorHeaders.eq(1).text().trim()).toEqual('Name')
          expect(visitorHeaders.eq(2).text().trim()).toEqual('Age')
          expect(visitorHeaders.eq(3).text().trim()).toEqual('Relationship')
          expect(visitorHeaders.eq(4).text().trim()).toEqual('Address')
          expect(visitorHeaders.eq(5).text().trim()).toEqual('Active restrictions')

          const visitorRows = getByDataQa($, 'visitors-table').find('tbody > tr > td')
          // Row 1
          expect(visitorRows.eq(0).text().trim()).toEqual(
            `${mockOfficialVisitors[0].firstName} ${mockOfficialVisitors[0].lastName}`,
          )
          expect(visitorRows.eq(1).text().trim()).toEqual('Over 18')
          expect(visitorRows.eq(2).text().trim()).toEqual(mockOfficialVisitors[0].relationshipToPrisonerDescription)
          expect(visitorRows.eq(3).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(4).text().trim()).toBeDefined() // Restrictions
          // Row 2
          expect(visitorRows.eq(5).text().trim()).toEqual(
            `${mockOfficialVisitors[1].firstName} ${mockOfficialVisitors[1].lastName}`,
          )
          expect(visitorRows.eq(6).text().trim()).toEqual('Over 18')
          expect(visitorRows.eq(7).text().trim()).toEqual(mockOfficialVisitors[1].relationshipToPrisonerDescription)
          expect(visitorRows.eq(8).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(9).text().trim()).toBeDefined() // Restrictions

          expect($('.govuk-back-link').attr('href')).toEqual(`./`)
          expect($('.govuk-button').text()).toContain('Continue')
          expect($('.govuk-link').last().text()).toContain('Cancel and return to visit details')
          expect($('.govuk-link').last().attr('href')).toContain(`./`)

          // Calls expected
          expect(officialVisitsService.getAllOfficialContacts).toHaveBeenCalledWith(
            mockPrisoner.prisonerNumber,
            user,
            undefined,
            true,
          )
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.SELECT_OFFICIAL_VISITORS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })

    it('should render the correct view page with no restrictions or contacts', () => {
      // No contacts or restrictions
      appSetup({
        officialVisit: {
          prisoner: {
            ...mockPrisoner,
            restrictions: [],
          },
          prisonCode: 'MDI',
          availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
        } as OfficialVisitJourney,
      })

      officialVisitsService.getAllOfficialContacts.mockResolvedValue([])

      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          // Check we have completed step 2/6 on the progress tracker
          expect(getProgressTrackerCompleted($)).toHaveLength(2)
          expect(getProgressTrackerItems($)).toHaveLength(5)

          const heading = getPageHeader($)
          expect(heading).toEqual("Select official visitors from the prisoner's approved contact list")

          // Prisoner restrictions - empty
          expect(getByDataQa($, 'empty-restrictions-title').text().trim()).toContain('active restrictions')
          expect(getByDataQa($, 'empty-restrictions-message').text().trim()).toEqual('No active restrictions')

          // Prisoner contacts - empty content
          expect(getByDataQa($, 'empty-contacts-title').text().trim()).toEqual('Approved official contacts')
          expect(getByDataQa($, 'empty-contacts-message').text().trim()).toEqual('No approved official contacts')
          // contact link displayed only for contacts authorizer role
          expect(getByDataQa($, 'contacts-link').length).toEqual(1)

          // Calls expected
          expect(officialVisitsService.getAllOfficialContacts).toHaveBeenCalledWith(
            mockPrisoner.prisonerNumber,
            user,
            undefined,
            true,
          )
          expect(auditService.logPageView).toHaveBeenCalledWith(Page.SELECT_OFFICIAL_VISITORS_PAGE, {
            who: user.username,
            correlationId: expect.any(String),
          })
        })
    })
  })

  describe('POST', () => {
    it('should error if no official visitors are selected', () => {
      return request(app)
        .post(URL)
        .send({})
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'selected',
              href: '#selected',
              text: 'Select at least one official contact',
            },
          ]),
        )
    })

    it('should accept the selection of one official visitor and redirect to social visitors page', async () => {
      await request(app)
        .post(URL)
        .send({ selected: ['101-SOL'] })
        .expect(302)
        .expect('location', 'select-social-visitors')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors).toHaveLength(1)
    })

    it('should accept the selection of one official visitor and redirect to assistance page', async () => {
      config.featureToggles.allowSocialVisitorsPrisons = ''
      await request(app)
        .post(URL)
        .send({ selected: ['101-SOL'] })
        .expect(302)
        .expect('location', 'assistance-required')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors).toHaveLength(1)
    })

    it('should redirect to social visitors page when social visitors exist in journey data even if prison is not enabled', async () => {
      appSetup({
        officialVisit: {
          prisoner: {
            ...mockPrisoner,
            restrictions: mockPrisonerRestrictions,
          },
          prisonCode: 'MDI',
          availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
          socialVisitors: [
            {
              prisonerContactId: 2,
              contactId: 201,
              prisonerNumber: 'A1234',
              firstName: 'Jane',
              lastName: 'Doe',
              relationshipTypeCode: 'S',
              relationshipTypeDescription: 'Social',
              relationshipToPrisonerCode: 'FRI',
              relationshipToPrisonerDescription: 'Friend',
            } as JourneyVisitor,
          ],
        } as OfficialVisitJourney,
      })

      config.featureToggles.allowSocialVisitorsPrisons = '' // Prison not enabled
      await request(app)
        .post(URL)
        .send({ selected: ['101-SOL'] })
        .expect(302)
        .expect('location', 'select-social-visitors')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors).toHaveLength(1)
    })

    it('should accept the selection of two or more official visitors', async () => {
      config.featureToggles.allowSocialVisitorsPrisons = 'MDI'
      await request(app)
        .post(URL)
        .send({ selected: ['101-SOL', '102-POL'] })
        .expect(302)
        .expect('location', 'select-social-visitors')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors).toHaveLength(2)
    })

    it('should accept the selection of two or more official visitors (amend)', async () => {
      config.featureToggles.allowSocialVisitorsPrisons = 'MDI'
      await request(app)
        .post(`/manage/amend/1/${journeyId()}/select-official-visitors`)
        .send({ selected: ['101-SOL', '102-POL'] })
        .expect(302)
        .expect('location', 'select-social-visitors')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors).toHaveLength(2)
    })

    it('should handle official visitors with same contact ID but different relationship codes', async () => {
      const mockVisitorsWithSameContactId = [
        ...mockOfficialVisitors,
        {
          ...mockOfficialVisitors[0],
          relationshipToPrisonerCode: 'JUD',
          relationshipToPrisonerDescription: 'Judge',
        },
      ]
      officialVisitsService.getAllOfficialContacts.mockResolvedValue(mockVisitorsWithSameContactId)

      await request(app)
        .post(URL)
        .send({ selected: ['101-SOL', '101-JUD'] })
        .expect(200)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          // Verify the duplicate contact error alert is displayed
          expect($('.moj-alert--warning').length).toBe(1)
          expect($('.moj-alert__heading').text()).toContain('Duplicate visitors selected')
          expect($('.moj-alert__content').text()).toContain('You have selected the same contact more than once')
        })

      // Verify the visitors are saved to session but validation error prevents progression
      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors).toHaveLength(2)

      const visitors = journeySession.officialVisitors
      const solicitorVisitor = visitors.find((v: JourneyVisitor) => v.relationshipToPrisonerCode === 'SOL')
      const judgeVisitor = visitors.find((v: JourneyVisitor) => v.relationshipToPrisonerCode === 'JUD')

      expect(solicitorVisitor).toBeDefined()
      expect(solicitorVisitor.contactId).toBe(101)
      expect(solicitorVisitor.relationshipToPrisonerCode).toBe('SOL')

      expect(judgeVisitor).toBeDefined()
      expect(judgeVisitor.contactId).toBe(101)
      expect(judgeVisitor.relationshipToPrisonerCode).toBe('JUD')
    })
  })
})
