import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import AuditService from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import { TimeSlot } from '../../../../@types/officialVisitsApi/types'

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

      const res = await request(app).get('/admin/locations/time-slot/123/edit?day=MON').expect(200)
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
      expect(res.text).toContain('<a href="/admin/days#monday" class="govuk-back-link">Back</a>')
      const cancelAnchor = $('a[href="/admin/days#monday"]').eq(1)
      const cancelText = cancelAnchor.text().replace(/\s+/g, ' ').trim()
      expect(cancelText).toBe('Cancel and return to schedule')
    })
  })

  describe('POST', () => {
    it('shows errors when required fields missing', () => {
      return request(app)
        .post('/admin/locations/time-slot/1/edit')
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
        .post('/admin/locations/time-slot/1/edit')
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
              fieldId: 'startDate',
              href: '#startDate',
              text: 'Select a date that is today or in the future for the start date',
            },
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
        .post('/admin/locations/time-slot/1/edit')
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
        .post('/admin/locations/time-slot/1/edit')
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
        .post('/admin/locations/time-slot/1/edit')
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
        .post('/admin/locations/time-slot/123/edit?day=MON')
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
        .expect('location', '/admin/days#monday')

      expect(officialVisitsService.updateTimeSlot).toHaveBeenCalled()
    })
  })
})
