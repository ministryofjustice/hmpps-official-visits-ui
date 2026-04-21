import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import AuditService from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import { TimeSlot, TimeSlotSummary } from '../../../../@types/officialVisitsApi/types'
import { allSlots } from '../../../../testutils/mocks'

jest.mock('../../../../services/auditService')
jest.mock('../../../../services/officialVisitsService')

const auditService = new AuditService(null) as jest.Mocked<AuditService>
const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({ services: { auditService, officialVisitsService }, userSupplier: () => adminUser })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('EditTimeSlotHandler', () => {
  describe('GET', () => {
    it('renders edit page', async () => {
      const existing = {
        prisonTimeSlotId: 123,
        effectiveDate: '2024-01-01',
        expiryDate: '2025-01-01',
        startTime: '10:00',
        endTime: '11:00',
      }

      officialVisitsService.getPrisonTimeSlotById.mockResolvedValue(existing as TimeSlot)

      const res = await request(app).get('/admin/time-slot/123/edit?day=MON').expect(200)
      const $ = cheerio.load(res.text)
      const heading = $('h1.govuk-heading-l').text().trim()
      expect(heading).toEqual('Edit a time for Monday')

      // hidden timeSlotId input is present
      expect($('input[name="timeSlotId"]').val()).toBe('123')

      // check start and end time prefilled
      expect($('input[name="startTime-startHour"]').val()).toBe('10')
      expect($('input[name="startTime-startMinute"]').val()).toBe('00')
      expect($('input[name="endTime-endHour"]').val()).toBe('11')
      expect($('input[name="endTime-endMinute"]').val()).toBe('00')
      expect(res.text).toContain('<a href="/admin/time-slots#monday" class="govuk-back-link">Back</a>')
      const cancelAnchor = $('a[href="/admin/time-slots#monday"]').eq(1)
      const cancelText = cancelAnchor.text().replace(/\s+/g, ' ').trim()
      expect(cancelText).toBe('Cancel and return to schedule')
    })
  })

  describe('POST', () => {
    it('shows errors when required fields missing', () => {
      return request(app)
        .post('/admin/time-slot/1/edit')
        .send({ dayCode: 'MON' })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'startDate',
              href: '#startDate',
              text: 'Enter a start date',
            },
            {
              fieldId: 'startTime',
              href: '#startTime',
              text: 'Enter a valid start time',
            },
            {
              fieldId: 'endTime',
              href: '#endTime',
              text: 'Enter a valid end time',
            },
          ]),
        )
    })

    it('shows errors when effective and expiry dates are in the past', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      return request(app)
        .post('/admin/time-slot/1/edit')
        .send({
          dayCode: 'MON',
          startDate: yesterdayStr,
          timeSlotId: 1,
          expiryDate: yesterdayStr,
          'startTime-startHour': '09',
          'startTime-startMinute': '00',
          'endTime-endHour': '10',
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'expiryDate',
              href: '#expiryDate',
              text: 'Select a date that is today or in the future for the end date',
            },
          ]),
        )
    })

    it('shows errors when day code is invalid', () => {
      return request(app)
        .post('/admin/time-slot/1/edit')
        .send({
          timeSlotId: 1,
          dayCode: 'DEN', // invalid day code
          startDate: '2055-12-25',
          expiryDate: '2066-12-25',
          'startTime-startHour': '09',
          'startTime-startMinute': '00',
          'endTime-endHour': '10',
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'dayCode',
              href: '#dayCode',
              text: 'Unrecognised day code (e.g. MON, TUE, WED)',
            },
          ]),
        )
    })

    it('shows errors when date and time formats are invalid', () => {
      return request(app)
        .post('/admin/time-slot/1/edit')
        .send({
          timeSlotId: 1,
          dayCode: 'MON',
          startDate: 'invalid-date',
          expiryDate: 'also-invalid',
          'startTime-startHour': 'invalid-hour',
          'startTime-startMinute': 'invalid-minute',
          'endTime-endHour': 'invalid-hour',
          'endTime-endMinute': 'invalid-minute',
        })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'startDate',
              href: '#startDate',
              text: 'Enter a valid start date',
            },
            {
              fieldId: 'expiryDate',
              href: '#expiryDate',
              text: 'Enter a valid expiry date',
            },
            {
              fieldId: 'startTime',
              href: '#startTime',
              text: 'Enter a valid start time',
            },
            {
              fieldId: 'endTime',
              href: '#endTime',
              text: 'Enter a valid end time',
            },
          ]),
        )
    })

    it('shows errors when time fields are out of allowed range', () => {
      return request(app)
        .post('/admin/time-slot/1/edit')
        .send({
          timeSlotId: 1,
          dayCode: 'MON',
          startDate: '2055-12-25',
          expiryDate: '2066-12-25',
          'startTime-startHour': '07', // before allowed range
          'startTime-startMinute': '00',
          'endTime-endHour': '22', // after allowed range
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'startTime',
              href: '#startTime',
              text: 'Enter start time between 08:00 and 20:00',
            },
            {
              fieldId: 'endTime',
              href: '#endTime',
              text: 'Enter end time between 08:00 and 21:00',
            },
          ]),
        )
    })

    it('calls updateTimeSlot', async () => {
      await request(app)
        .post('/admin/time-slot/123/edit?day=MON')
        .send({
          dayCode: 'MON',
          timeSlotId: '123',
          startDate: '2055-12-25',
          expiryDate: '2066-12-25',
          'startTime-startHour': '09',
          'startTime-startMinute': '00',
          'endTime-endHour': '10',
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/admin/time-slots#monday')

      expect(officialVisitsService.updateTimeSlot).toHaveBeenCalled()
    })

    it('allows updating when candidate start is after existing expiry', async () => {
      officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(allSlots)
      officialVisitsService.updateTimeSlot.mockResolvedValue({
        prisonTimeSlotId: 999,
        prisonCode: 'HEI',
        dayCode: 'MON',
        startTime: '09:00',
        endTime: '10:00',
        effectiveDate: '2057-01-01',
        expiryDate: '2058-01-01',
      } as unknown as TimeSlot)

      await request(app)
        .post('/admin/time-slot/123/edit?day=MON')
        .send({
          dayCode: 'MON',
          startDate: '2057-01-01',
          expiryDate: '2058-01-01',
          'startTime-startHour': '09',
          'startTime-startMinute': '00',
          'endTime-endHour': '10',
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/admin/time-slots#monday')

      expect(officialVisitsService.updateTimeSlot).toHaveBeenCalled()
    })

    it('allows updating when candidate expiry is before existing effective date', async () => {
      const futureExisting = {
        prisonCode: '',
        prisonName: '',
        timeSlots: [
          {
            timeSlot: {
              dayCode: 'MON',
              prisonTimeSlotId: 50,
              startTime: '09:00',
              endTime: '10:00',
              effectiveDate: '2050-01-01',
              expiryDate: '2055-12-31',
              prisonCode: 'MDI',
              createdBy: 'BP',
              createdTime: '2050-01-01T09:00:00',
            },
            visitSlots: [] as unknown as TimeSlot[],
          },
        ],
      } as unknown as TimeSlotSummary
      officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(futureExisting)
      officialVisitsService.updateTimeSlot.mockResolvedValue({
        prisonTimeSlotId: 999,
        prisonCode: 'HEI',
        dayCode: 'MON',
        startTime: '09:00',
        endTime: '10:00',
        effectiveDate: '2025-01-01',
        expiryDate: '2049-12-31',
      } as unknown as TimeSlot)

      await request(app)
        .post('/admin/time-slot/123/edit?day=MON')
        .send({
          dayCode: 'MON',
          startDate: '2049-01-01',
          expiryDate: '2049-12-31', // new expiry before existing effective date
          'startTime-startHour': '09',
          'startTime-startMinute': '00',
          'endTime-endHour': '10',
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/admin/time-slots#monday')

      expect(officialVisitsService.updateTimeSlot).toHaveBeenCalled()
    })

    it('shows validation error when candidate encloses an existing slot (overlaps from both ends)', async () => {
      const futureExisting = {
        prisonCode: '',
        prisonName: '',
        timeSlots: [
          {
            timeSlot: {
              dayCode: 'MON',
              prisonTimeSlotId: 50,
              startTime: '09:00',
              endTime: '10:00',
              effectiveDate: '2050-01-01',
              expiryDate: '2055-12-31',
              prisonCode: 'MDI',
              createdBy: 'BP',
              createdTime: '2050-01-01T09:00:00',
            },
            visitSlots: [] as unknown as TimeSlot[],
          },
        ],
      } as unknown as TimeSlotSummary

      officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(futureExisting)

      // candidate encloses existing: starts before existing.effectiveDate and expires after existing.expiryDate
      await request(app)
        .post('/admin/time-slot/123/edit?day=MON')
        .send({
          dayCode: 'MON',
          startDate: '2049-01-01',
          expiryDate: '2056-01-01',
          'startTime-startHour': '09',
          'startTime-startMinute': '00',
          'endTime-endHour': '10',
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'startTime',
              href: '#startTime',
              text: 'A time slot with the same day and time already exists for the provided date range',
            },
          ]),
        )
    })

    it('shows validation error when existing slot has no expiry (open-ended) and would overlap', async () => {
      const futureOpenEnded = {
        prisonCode: '',
        prisonName: '',
        timeSlots: [
          {
            timeSlot: {
              dayCode: 'MON',
              prisonTimeSlotId: 99,
              startTime: '09:00',
              endTime: '10:00',
              effectiveDate: '2050-01-01',
              expiryDate: null, // no expiry date open-ended slot
              prisonCode: 'MDI',
              createdBy: 'BP',
              createdTime: '2050-01-01T09:00:00',
            } as unknown as TimeSlot,
            visitSlots: [] as unknown as TimeSlot[],
          },
        ],
      } as unknown as TimeSlotSummary

      officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(futureOpenEnded)

      await request(app)
        .post('/admin/time-slot/123/edit?day=MON')
        .send({
          dayCode: 'MON',
          startDate: '2051-01-01',
          expiryDate: '2051-12-31',
          'startTime-startHour': '09',
          'startTime-startMinute': '00',
          'endTime-endHour': '10',
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'startTime',
              href: '#startTime',
              text: 'A time slot with the same day and time already exists for the provided date range',
            },
          ]),
        )
    })

    it('shows validation error when candidate start equals existing expiry (boundary equality considered overlapping)', async () => {
      officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(allSlots)

      await request(app)
        .post('/admin/time-slot/123/edit?day=MON')
        .send({
          dayCode: 'MON',
          startDate: '2056-12-31',
          expiryDate: '2057-12-31',
          'startTime-startHour': '09',
          'startTime-startMinute': '00',
          'endTime-endHour': '10',
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/')
        .expect(() =>
          expectErrorMessages([
            {
              fieldId: 'startTime',
              href: '#startTime',
              text: 'A time slot with the same day and time already exists for the provided date range',
            },
          ]),
        )
    })
  })
})
