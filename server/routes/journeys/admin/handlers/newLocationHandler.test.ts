import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import AuditService from '../../../../services/auditService'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import { TimeSlot, TimeSlotSummaryItem, VisitLocation } from '../../../../@types/officialVisitsApi/types'

jest.mock('../../../../services/officialVisitsService')
jest.mock('../../../../services/auditService')

const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express

beforeEach(() => {
  officialVisitsService.createVisitSlot.mockResolvedValue({} as TimeSlot)
  app = appWithAllRoutes({ services: { officialVisitsService, auditService }, userSupplier: () => adminUser })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('NewVisitSlotHandler', () => {
  describe('GET', () => {
    it('renders the add new location page', async () => {
      officialVisitsService.getOfficialVisitLocationsAtPrison.mockResolvedValue([
        { locationId: 'loc-1', locationName: 'Visit room 1' },
        { locationId: 'loc-2', locationName: 'Visit room 2' },
      ] as VisitLocation[])

      const existing = {
        prisonTimeSlotId: 123,
        dayCode: 'MON',
        effectiveDate: '2024-01-01',
        expiryDate: '2025-01-01',
        startTime: '10:00',
        endTime: '11:00',
      }
      officialVisitsService.getPrisonTimeSlotById.mockResolvedValue(existing as TimeSlot)
      // Simulate that loc-1 is already used in a visit slot for this time slot
      officialVisitsService.getPrisonTimeSlotSummaryById.mockResolvedValue({
        timeSlot: existing,
        visitSlots: [{ visitSlotId: 1, dpsLocationId: 'loc-1' }],
      } as TimeSlotSummaryItem)

      const res = await request(app).get('/admin/time-slot/1/location/new')

      expect(res.status).toBe(200)
      expect(res.text).toContain('Add a new room and visitor limits')
      expect(res.text).toContain('Monday')
      expect(res.text).toContain('10:00 to 11:00')
      expect(res.text).toContain('Understanding visitor limits')
      expect(res.text).toContain('Maximum visitors (this does not include prisoners)')
      expect(res.text).toContain('Maximum groups')
      expect(res.text).toContain('Maximum video visits')

      const $ = cheerio.load(res.text)
      // Understanding visitor limits expandable details with content
      const details = $('details.govuk-details')
      expect(details.length).toBe(1)
      expect(details.find('.govuk-details__summary-text').text().trim()).toBe('Understanding visitor limits')
      expect(details.find('.govuk-details__text').text()).toContain(
        'When you book a time slot for an official visit, you can add a maximum number of',
      )
      expect(details.find('.govuk-details__text').text()).toContain('each video visit takes up 1 group visit slot')
      expect($('select#dpsLocationId').length).toBeGreaterThan(0)
      const options = $('select#dpsLocationId option')
        .map((i, el) => $(el).attr('value'))
        .get()
      expect(options).not.toContain('loc-1')
      expect(options).toContain('loc-2')
      expect(res.text).toContain('<a href="/admin/time-slot/1/locations" class="govuk-back-link">Back</a>')
      const cancelAnchor = $('a[href="/admin/time-slot/1/locations"]').eq(1)
      const cancelText = cancelAnchor.text().replace(/\s+/g, ' ').trim()
      expect(cancelText).toBe('Cancel and return to schedule')
    })
  })

  describe('POST', () => {
    it('shows validation error when no location selected', async () => {
      await request(app).post('/admin/time-slot/1/location/new').send({}).expect(302)

      expectErrorMessages([{ fieldId: 'dpsLocationId', href: '#dpsLocationId', text: 'Select a location' }])
    })

    it('should show validation error when maxAdults is not a number', async () => {
      await request(app)
        .post('/admin/time-slot/1/location/new')
        .send({ dpsLocationId: 'loc-1', maxAdults: 'not-a-number' })
        .expect(302)

      expectErrorMessages([{ fieldId: 'maxAdults', href: '#maxAdults', text: 'Enter a valid number' }])
    })

    it('should show validation error when maxGroups is not a number', async () => {
      await request(app)
        .post('/admin/time-slot/1/location/new')
        .send({ dpsLocationId: 'loc-1', maxGroups: 'not-a-number' })
        .expect(302)

      expectErrorMessages([{ fieldId: 'maxGroups', href: '#maxGroups', text: 'Enter a valid number' }])
    })

    it('should show validation error when maxVideo is not a number', async () => {
      await request(app)
        .post('/admin/time-slot/1/location/new')
        .send({ dpsLocationId: 'loc-1', maxVideo: 'not-a-number' })
        .expect(302)

      expectErrorMessages([{ fieldId: 'maxVideo', href: '#maxVideo', text: 'Enter a valid number' }])
    })

    it('creates a visit slot and redirects on success', async () => {
      await request(app)
        .post('/admin/time-slot/1/location/new')
        .send({ dpsLocationId: 'loc-1', maxAdults: '5', maxGroups: '2', maxVideo: '0' })
        .expect(302)
        .expect('location', '/admin/time-slot/1/locations')

      expect(officialVisitsService.createVisitSlot).toHaveBeenCalledWith(
        1,
        {
          dpsLocationId: 'loc-1',
          maxAdults: 5,
          maxGroups: 2,
          maxVideo: 0,
        },
        adminUser,
      )
    })
  })
})
