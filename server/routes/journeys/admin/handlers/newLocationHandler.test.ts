import type { Express } from 'express'
import request from 'supertest'
import * as cheerio from 'cheerio'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import AuditService from '../../../../services/auditService'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import { TimeSlot, VisitLocation } from '../../../../@types/officialVisitsApi/types'

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

      const res = await request(app).get('/admin/locations/time-slot/1/visit-slot/new')

      expect(res.status).toBe(200)
      expect(res.text).toContain('Add new location and capacities')
      expect(res.text).toContain('Monday')
      expect(res.text).toContain('10:00 - 11:00')
      expect(res.text).toContain(
        'Add a new location and location capacity. For video visits location capacities should',
      )
      expect(res.text).toContain('Capacity')
      expect(res.text).toContain('Maximum adults capacity')
      expect(res.text).toContain('Number of people that can be in the room')
      expect(res.text).toContain('Maximum groups capacity')
      expect(res.text).toContain('Number of separate groups (visits)')
      expect(res.text).toContain('Maximum video visits capacity')
      expect(res.text).toContain('Total number of video visit you can book for this location')

      const $ = cheerio.load(res.text)
      expect($('select#dpsLocationId').length).toBeGreaterThan(0)
    })
  })

  describe('POST', () => {
    it('shows validation error when no location selected', async () => {
      await request(app).post('/admin/locations/time-slot/1/visit-slot/new').send({}).expect(302)

      expectErrorMessages([{ fieldId: 'dpsLocationId', href: '#dpsLocationId', text: 'Select a location' }])
    })

    it('should show validation error when maxAdults is not a number', async () => {
      await request(app)
        .post('/admin/locations/time-slot/1/visit-slot/new')
        .send({ dpsLocationId: 'loc-1', maxAdults: 'not-a-number' })
        .expect(302)

      expectErrorMessages([{ fieldId: 'maxAdults', href: '#maxAdults', text: 'Enter a valid number' }])
    })

    it('should show validation error when maxGroups is not a number', async () => {
      await request(app)
        .post('/admin/locations/time-slot/1/visit-slot/new')
        .send({ dpsLocationId: 'loc-1', maxGroups: 'not-a-number' })
        .expect(302)

      expectErrorMessages([{ fieldId: 'maxGroups', href: '#maxGroups', text: 'Enter a valid number' }])
    })

    it('should show validation error when maxVideo is not a number', async () => {
      await request(app)
        .post('/admin/locations/time-slot/1/visit-slot/new')
        .send({ dpsLocationId: 'loc-1', maxVideo: 'not-a-number' })
        .expect(302)

      expectErrorMessages([{ fieldId: 'maxVideo', href: '#maxVideo', text: 'Enter a valid number' }])
    })

    it('creates a visit slot and redirects on success', async () => {
      await request(app)
        .post('/admin/locations/time-slot/1/visit-slot/new')
        .send({ dpsLocationId: 'loc-1', maxAdults: '5', maxGroups: '2', maxVideo: '0' })
        .expect(302)
        .expect('location', '/admin/locations/time-slot/1/location')

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
