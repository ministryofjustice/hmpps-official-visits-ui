import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'

import OfficialVisitsService from '../../../../services/officialVisitsService'
import { appWithAllRoutes, user } from '../../../testutils/appSetup'
import { mockPrisoner, mockPrisonerRestrictions, mockUser, mockVisitByIdVisit } from '../../../../testutils/mocks'
import { OfficialVisitNotifications } from '../../../../@types/officialVisitsApi/types'
import ManageUserService from '../../../../services/manageUsersService'
import PrisonerService from '../../../../services/prisonerService'
import PersonalRelationshipsService from '../../../../services/personalRelationshipsService'
import { Prisoner } from '../../../../@types/prisonerSearchApi/types'
import { getByDataQa, getPageHeader } from '../../../testutils/cheerio'
import { convertToTitleCase } from '../../../../utils/utils'

jest.mock('../../../../services/officialVisitsService')
jest.mock('../../../../services/manageUsersService')
jest.mock('../../../../services/prisonerService')
jest.mock('../../../../services/personalRelationshipsService')

const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const manageUsersService = new ManageUserService(null) as jest.Mocked<ManageUserService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const personalRelationshipsService = new PersonalRelationshipsService(null) as jest.Mocked<PersonalRelationshipsService>

let app: Express

const appSetup = () => {
  app = appWithAllRoutes({
    services: {
      personalRelationshipsService,
      prisonerService,
      officialVisitsService,
      manageUsersService,
    },
    userSupplier: () => user,
  })
}

beforeEach(() => {
  appSetup()

  officialVisitsService.getOfficialVisitById.mockResolvedValue(mockVisitByIdVisit)
  officialVisitsService.getNotificationsByOfficialVisitId.mockResolvedValue([])
  manageUsersService.getUserByUsername.mockImplementation(async username => ({
    ...mockUser,
    name: username,
    username,
  }))
  officialVisitsService.getOfficialVisitAuditedEvents.mockResolvedValue([
    {
      auditedEventId: 1,
      officialVisitId: ovId,
      eventSummary: 'Visit updated',
      eventSource: 'DPS',
      eventDetail:
        'Visitor added, Visitor updated changed from Joe Bloggs to Jane Bloggs, Start Time changed from 14:00 to 15:00',
      eventVersion: 2,
      eventType: 'UPDATE',
      eventChanges: [
        {
          field: 'visitor_added',
        },
        {
          field: 'visitor_updated',
          oldValue: 'Joe Bloggs',
          newValue: 'Jane Bloggs',
        },
        {
          field: 'start_time',
          oldValue: '14:00',
          newValue: '15:00',
        },
        {
          field: 'visit_type',
          oldValue: 'VIDEO',
          newValue: 'TELEPHONE',
        },
      ],
      eventDateTime: '2026-10-25T14:30:00.000000',
      eventUsername: 'JBLOGGS',
      eventUserFullName: 'Joe Bloggs',
      significantChange: true,
    },
  ])
  personalRelationshipsService.getPrisonerRestrictions.mockResolvedValue({ content: mockPrisonerRestrictions })
  prisonerService.getPrisonerByPrisonerNumber.mockResolvedValue(mockPrisoner as unknown as Prisoner)
})

afterEach(() => {
  jest.resetAllMocks()
})

const ovId = 1
const URL = `/view/visit/${ovId}/history`

describe('OfficialVisitHistoryHandler', () => {
  describe('GET', () => {
    it('should render the official visit history timeline', async () => {
      officialVisitsService.getNotificationsByOfficialVisitId.mockResolvedValue([
        {
          notificationId: 2,
          officialVisitId: ovId,
          templateId: 'template-2',
          emailAddress: 'visitor@example.com',
          reason: 'OFFICIAL_VISIT_CREATED',
          govNotifyNotificationId: '11111111-1111-1111-1111-111111111111',
          emailStatus: 'SENT',
          createdBy: 'Admin',
          createdTime: '2026-10-25T15:30:00.000000',
          statusUpdatedTime: '2026-10-25T15:30:00.000000',
        },
        {
          notificationId: 3,
          officialVisitId: ovId,
          templateId: 'template-3',
          emailAddress: 'visitor@example.com',
          reason: 'OFFICIAL_VISIT_UPDATED',
          govNotifyNotificationId: '22222222-2222-2222-2222-222222222222',
          emailStatus: 'TEMPORARY_FAILURE',
          createdBy: 'Admin',
          createdTime: '2026-10-25T13:30:00.000000',
          statusUpdatedTime: '2026-10-25T13:30:00.000000',
        },
      ])

      await request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-hint').text()).toEqual('Manage official visits')
          expect(getPageHeader($)).toEqual('Official visit change history')

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
          const title = '.moj-timeline__title'
          expect($(title).eq(0).text().trim()).toBe('Email notification sent')
          expect($(title).eq(1).text().trim()).toBe('Visit updated')
          expect($(title).eq(2).text().trim()).toBe('Email notification failed')
          const subLine = '.moj-timeline__byline'
          expect($(subLine).eq(0).text()).toContain('by Admin')
          expect($(subLine).eq(1).text()).toContain('Joe Bloggs')
          const date = '.moj-timeline__date'
          expect($(date).eq(0).text().trim()).toBe('25 October 2026 at 15:30')
          expect($(date).eq(1).text().trim()).toBe('25 October 2026 at 14:30')
          expect($(date).eq(2).text().trim()).toBe('25 October 2026 at 13:30')
          const description = '.moj-timeline__description'
          expect($(description).text()).toContain('Email address: visitor@example.com')
          expect($(description).text()).toContain('Reason: Email notification for created visit')
          expect($(description).text()).toContain('Visitor added')
          expect($(description).text()).toContain('Visitor updated changed from Joe Bloggs to Jane Bloggs')
          expect($(description).text()).toContain('Visit type changed from Video to Telephone')
          expect($(description).text()).toContain('Start time changed from 14:00 to 15:00')
          expect($(description).text()).toContain('Reason: Email notification for updated visit')
          expect($(description).text()).toContain('Status: Failed')

          expect(officialVisitsService.getOfficialVisitById).toHaveBeenCalledWith(ovId, user)
          expect(officialVisitsService.getNotificationsByOfficialVisitId).toHaveBeenCalledWith(ovId, user)
          expect(officialVisitsService.getOfficialVisitAuditedEvents).toHaveBeenCalledWith(ovId, user)
        })
    })

    it('should safely handle unknown fields, whitespace values, and unexpected notification statuses', async () => {
      officialVisitsService.getOfficialVisitAuditedEvents.mockResolvedValue([
        {
          auditedEventId: 5,
          officialVisitId: ovId,
          eventSummary: '   ',
          eventType: 'UPDATE',
          eventSource: 'DPS',
          eventDetail:
            'Visitor added, Visitor updated changed from Joe Bloggs to Jane Bloggs, Start Time changed from 14:00 to 15:00',
          eventVersion: 2,
          eventChanges: [
            { field: 'visitor_removed', oldValue: '  John Smith  ' },
            { field: 'visit_slot', oldValue: '11733', newValue: '11679' },
            { field: '   ', oldValue: '   ', newValue: '   ' },
          ],
          eventDateTime: '   ',
          eventUsername: '   ',
          eventUserFullName: '   ',
          significantChange: true,
        },
      ])

      officialVisitsService.getNotificationsByOfficialVisitId.mockResolvedValue([
        {
          notificationId: 10,
          officialVisitId: ovId,
          templateId: 'template-10',
          emailAddress: '   ',
          reason: '',
          govNotifyNotificationId: '33333333-3333-3333-3333-333333333333',
          emailStatus: 'NOT_A_STATUS',
          createdTime: '',
          statusUpdatedTime: 'not-a-date',
        },
      ] as unknown as OfficialVisitNotifications)

      await request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const titles = $('.moj-timeline__title')
            .map((_index, element) => $(element).text().trim())
            .get()
          const bylines = $('.moj-timeline__byline')
            .map((_index, element) => $(element).text().trim())
            .get()
          const dates = $('.moj-timeline__date')
            .map((_index, element) => $(element).text().trim())
            .get()
          const descriptions = $('.moj-timeline__description')
            .map((_index, element) => $(element).text())
            .get()

          expect(titles).toEqual(expect.arrayContaining(['Email notification failed', 'Activity updated']))
          expect(bylines[0]).toContain('by System')
          expect(bylines[1]).toContain('System')
          expect(dates).toEqual(expect.arrayContaining(['1 January 1970 at 00:00']))
          expect(descriptions.join(' ')).toContain('Email address: Not provided')
          expect(descriptions.join(' ')).toContain('Reason: Not provided')
          expect(descriptions.join(' ')).toContain('Status: Failed')
          expect(descriptions.join(' ')).toContain('Visitor removed')
          expect(descriptions.join(' ')).not.toContain('Visit Slot changed from 11733 to 11679')
          expect(descriptions.join(' ')).toContain('Field')
        })
    })

    it('should render an empty history message', async () => {
      officialVisitsService.getNotificationsByOfficialVisitId.mockResolvedValue([])
      officialVisitsService.getOfficialVisitAuditedEvents.mockResolvedValue([])

      await request(app)
        .get(URL)
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)

          expect($('.govuk-body').text()).toContain('No change history found for this official visit.')
        })
    })
  })
})
