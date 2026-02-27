import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import AuditService from '../../../../services/auditService'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'

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

describe('NewTimeSlotHandler', () => {
  describe('GET', () => {
    it('renders the add new time page with day label', () => {
      return request(app)
        .get('/admin/locations/time-slot/new?day=MON')
        .expect('Content-Type', /html/)
        .expect(res => {
          const $ = cheerio.load(res.text)
          const heading = $('h1.govuk-heading-l').text().trim()
          expect(heading).toEqual('Add a new time for Monday')
          // assert back link goes to days page
          const backLink = $('a.govuk-back-link')
          expect(backLink.text().trim()).toEqual('Back')
          expect(backLink.attr('href')).toEqual('/admin/days')
          // assert date input fields are present
          expect($('input[name="startDate"]').length).toBe(1)
          expect($('input[name="expiryDate"]').length).toBe(1)
          // assert time input fields are present
          expect($('input[name="startTime-startHour"]').length).toBe(1)
          expect($('input[name="startTime-startMinute"]').length).toBe(1)
          expect($('input[name="endTime-endHour"]').length).toBe(1)
          expect($('input[name="endTime-endMinute"]').length).toBe(1)
        })
    })
  })

  describe('POST', () => {
    it('shows errors when required fields missing', () => {
      return request(app)
        .post('/admin/locations/time-slot/new')
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
        .post('/admin/locations/time-slot/new')
        .send({
          dayCode: 'MON',
          startDate: yesterdayStr,
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

    // test for valid day value
    it('shows errors when day code is invalid', () => {
      return request(app)
        .post('/admin/locations/time-slot/new')
        .send({
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
        .post('/admin/locations/time-slot/new')
        .send({
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
        .post('/admin/locations/time-slot/new')
        .send({
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
              text: 'Enter an hour between 08 and 20 and minutes between 0 and 59',
            },
            {
              fieldId: 'endTime',
              href: '#endTime',
              text: 'Enter an hour between 08 and 21 and minutes between 0 and 59',
            },
          ]),
        )
    })

    it('redirects back to days on success', async () => {
      await request(app)
        .post('/admin/locations/time-slot/new')
        .send({
          dayCode: 'MON',
          startDate: '2055-12-25',
          expiryDate: '2066-12-25',
          'startTime-startHour': '09',
          'startTime-startMinute': '00',
          'endTime-endHour': '10',
          'endTime-endMinute': '00',
        })
        .expect(302)
        .expect('location', '/admin/days')
    })
  })
})
