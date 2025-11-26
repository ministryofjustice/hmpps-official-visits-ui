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
import { mockOfficialVisitors, mockPrisonerRestrictions, prisoner } from '../../../../../testutils/mocks'
import { expectErrorMessages, expectNoErrorMessages } from '../../../../testutils/expectErrorMessage'
import { convertToTitleCase, formatDate } from '../../../../../utils/utils'

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
        ...prisoner,
        restrictions: mockPrisonerRestrictions,
      },
      availableSlots: [{ timeSlotId: 1, visitSlotId: 1 }],
    },
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
  officialVisitsService.getApprovedOfficialContacts.mockResolvedValue(mockOfficialVisitors)
})

afterEach(() => {
  jest.resetAllMocks()
})

const URL = `/manage/create/${journeyId()}/select-official-visitors`

describe('Select official visitors', () => {
  describe('GET', () => {
    it('should render the correct view page', () => {
      return request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          // Check we have completed step 2/6 on the progress tracker
          expect(getProgressTrackerCompleted($)).toHaveLength(2)
          expect(getProgressTrackerItems($)).toHaveLength(6)

          // Displaying the right progress bar labels and sequence
          const labels = getProgressTrackerLabels($)
          expect(labels.eq(0).text().trim()).toContain('Who is attending')
          expect(labels.eq(1).text().trim()).toContain('Visit time and place')
          expect(labels.eq(2).text().trim()).toContain('Visit type and visitors')
          expect(labels.eq(3).text().trim()).toContain('Optional information')
          expect(labels.eq(4).text().trim()).toContain('Review')
          expect(labels.eq(5).text().trim()).toContain('Confirm')

          // Check the prisoner mini-profile is present with correct prisoner details
          expect(getByDataQa($, 'mini-profile-person-profile-link').text().trim()).toEqual(
            convertToTitleCase(`${prisoner.lastName}, ${prisoner.firstName}`),
          )
          expect(getByDataQa($, 'mini-profile-prisoner-number').text().trim()).toEqual(prisoner.prisonerNumber)
          expect(getByDataQa($, 'mini-profile-dob').text().trim()).toBeFalsy()
          expect(getByDataQa($, 'mini-profile-cell-location').text().trim()).toBeFalsy()

          // Check page header
          const heading = getPageHeader($)
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
          // Row 3
          expect(visitorRows.eq(10).text().trim()).toEqual(
            `${mockOfficialVisitors[2].firstName} ${mockOfficialVisitors[2].lastName}`,
          )
          expect(visitorRows.eq(11).text().trim()).toEqual('Over 18')
          expect(visitorRows.eq(12).text().trim()).toEqual(mockOfficialVisitors[2].relationshipToPrisonerDescription)
          expect(visitorRows.eq(13).text().trim()).toContain(`Acorn Road`)
          expect(visitorRows.eq(14).text().trim()).toBeDefined() // Restrictions

          // Calls expected
          expect(officialVisitsService.getApprovedOfficialContacts).toHaveBeenCalledWith(
            prisoner.prisonCode,
            prisoner.prisonerNumber,
            user,
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

    it('should accept the selection of one official visitor', async () => {
      await request(app)
        .post(URL)
        .send({ selected: ['1'] })
        .expect(302)
        .expect('location', 'select-social-visitors')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors).toHaveLength(1)
    })

    it('should accept the selection of two or more official visitors', async () => {
      await request(app)
        .post(URL)
        .send({ selected: ['1', '2', '3'] })
        .expect(302)
        .expect('location', 'select-social-visitors')
        .expect(() => expectNoErrorMessages())

      const journeySession = await getJourneySession(app, 'officialVisit')
      expect(journeySession.officialVisitors).toHaveLength(3)
    })
  })
})
