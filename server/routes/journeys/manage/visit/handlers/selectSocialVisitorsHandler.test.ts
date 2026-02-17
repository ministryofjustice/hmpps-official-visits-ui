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
import { mockSocialVisitors, mockPrisonerRestrictions, mockPrisoner } from '../../../../../testutils/mocks'
import { expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
import { convertToTitleCase, formatDate } from '../../../../../utils/utils'
import TelemetryService from '../../../../../services/telemetryService'

jest.mock('../../../../../services/auditService')
jest.mock('../../../../../services/prisonerService')
jest.mock('../../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const telemetryService = new TelemetryService(null) as jest.Mocked<TelemetryService>

let app: Express

const appSetup = (
  journeySession = {
    officialVisit: {
      prisoner: {
        ...mockPrisoner,
        restrictions: mockPrisonerRestrictions,
      },
      availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
    },
  },
) => {
  app = appWithAllRoutes({
    services: { auditService, prisonerService, officialVisitsService, telemetryService },
    userSupplier: () => user,
    journeySessionSupplier: () => journeySession as Journey,
  })
}

beforeEach(() => {
  appSetup()
  officialVisitsService.getApprovedSocialContacts.mockResolvedValue(mockSocialVisitors)
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/select-social-visitors`

describe('Select social visitors', () => {
  describe('GET', () => {
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
          expect(visitorRows.eq(0).text().trim()).toEqual(
            `${mockSocialVisitors[0].firstName} ${mockSocialVisitors[0].lastName}`,
          )
          expect(visitorRows.eq(1).text().trim()).toEqual(formatDate(mockSocialVisitors[0].dateOfBirth))
          expect(visitorRows.eq(2).text().trim()).toEqual(mockSocialVisitors[0].relationshipToPrisonerDescription)
          expect(visitorRows.eq(3).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(4).text().trim()).toBeDefined() // Restrictions
          // Row 2
          expect(visitorRows.eq(5).text().trim()).toEqual(
            `${mockSocialVisitors[1].firstName} ${mockSocialVisitors[1].lastName}`,
          )
          expect(visitorRows.eq(6).text().trim()).toEqual(formatDate(mockSocialVisitors[1].dateOfBirth))
          expect(visitorRows.eq(7).text().trim()).toEqual(mockSocialVisitors[1].relationshipToPrisonerDescription)
          expect(visitorRows.eq(8).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(9).text().trim()).toBeDefined() // Restrictions
          // contact link displayed only for contacts authorizer role
          expect(getByDataQa($, 'contacts-link').length).toEqual(1)

          // Calls expected
          expect(officialVisitsService.getApprovedSocialContacts).toHaveBeenCalledWith(
            mockPrisoner.prisonCode,
            mockPrisoner.prisonerNumber,
            user,
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
        .send({ selected: ['1'] })
        .expect(302)
        .expect('location', 'assistance-required')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.socialVisitors).toHaveLength(1)
    })

    it('should accept the selection of two social visitors', async () => {
      await request(app)
        .post(URL)
        .send({ selected: ['1', '2'] })
        .expect(302)
        .expect('location', 'assistance-required')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.socialVisitors).toHaveLength(2)
    })
  })
})
