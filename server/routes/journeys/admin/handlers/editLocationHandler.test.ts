import type { Express } from 'express'
import request from 'supertest'
import cheerio from 'cheerio'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import AuditService from '../../../../services/auditService'
import { expectErrorMessages } from '../../../testutils/expectErrorMessage'
import { TimeSlot, VisitSlot } from '../../../../@types/officialVisitsApi/types'

jest.mock('../../../../services/officialVisitsService')
jest.mock('../../../../services/auditService')

const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>
const auditService = new AuditService(null) as jest.Mocked<AuditService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({ services: { officialVisitsService, auditService }, userSupplier: () => adminUser })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('EditLocationHandler', () => {
  describe('GET', () => {
    it('renders edit page', async () => {
      officialVisitsService.getPrisonTimeSlotById.mockResolvedValue({
        dayCode: 'MON',
        prisonTimeSlotId: 1,
        startTime: '09:00',
        endTime: '10:00',
        effectiveDate: '2025-01-01',
        expiryDate: '2056-12-31',
        prisonCode: 'MDI',
        createdBy: 'BP',
        createdTime: '2025-01-01T09:00:00',
      })
      officialVisitsService.getVisitSlot.mockResolvedValue({
        visitSlotId: 11,
        dpsLocationId: 'loc-1',
        locationDescription: 'Location 1',
        maxAdults: 5,
        maxGroups: 2,
        maxVideo: 0,
        prisonCode: '',
        prisonTimeSlotId: 0,
        createdBy: '',
        createdTime: '',
      } as VisitSlot)

      const res = await request(app).get('/admin/time-slot/1/location/11/edit')

      expect(res.status).toBe(200)
      expect(res.text).toContain('Edit location and location capacities')
      expect(res.text).toContain('Monday')
      expect(res.text).toContain('09:00 - 10:00')
      expect(res.text).toContain(
        'Make changes to the location or location capacity. For video visits location capacities should be',
      )
      expect(res.text).toContain('Maximum adults capacity')
      expect(res.text).toContain('Number of people that can be in the room')
      expect(res.text).toContain('Maximum groups capacity')
      expect(res.text).toContain('Number of separate groups (visits)')
      expect(res.text).toContain('Maximum video visits capacity')
      expect(res.text).toContain('Total number of video visit you can book for this location')
      // assert values pre populated
      expect(res.text).toContain('Visit location Location 1')

      expect(res.text).toMatch(/id="maxAdults"[^>]*value="5"/)
      expect(res.text).toMatch(/id="maxGroups"[^>]*value="2"/)
      expect(res.text).toMatch(/id="maxVideo"[^>]*value="0"/)
      expect(res.text).toContain('<a href="/admin/time-slot/1/locations" class="govuk-back-link">Back</a>')
      const $ = cheerio.load(res.text)
      const cancelAnchor = $('a[href="/admin/time-slot/1/locations"]').eq(1)
      const cancelText = cancelAnchor.text().replace(/\s+/g, ' ').trim()
      expect(cancelText).toBe('Cancel and return to schedule')
    })
  })

  describe('POST', () => {
    it('validates input and shows errors when invalid', async () => {
      await request(app).post('/admin/time-slot/1/location/11/edit').send({}).expect(302)
      expectErrorMessages([{ fieldId: 'dpsLocationId', href: '#dpsLocationId', text: 'Select a location' }])
    })

    it('updates and redirects on success', async () => {
      officialVisitsService.updateVisitSlot.mockResolvedValue({} as TimeSlot)

      await request(app)
        .post('/admin/time-slot/1/location/11/edit')
        .send({ dpsLocationId: 'loc-1', maxAdults: '5', maxGroups: '2', maxVideo: '0' })
        .expect(302)

      expect(officialVisitsService.updateVisitSlot).toHaveBeenCalledWith(
        11,
        { dpsLocationId: 'loc-1', maxAdults: 5, maxGroups: 2, maxVideo: 0 },
        adminUser,
      )
    })
  })
})
