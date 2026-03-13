import type { Express } from 'express'
import request from 'supertest'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import AuditService from '../../../../services/auditService'
import { VisitSlot } from '../../../../@types/officialVisitsApi/types'

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

const visitSlot = (hasVisit: boolean = true): VisitSlot => ({
  visitSlotId: 11,
  dpsLocationId: 'loc-1',
  locationDescription: 'Location 1',
  maxAdults: 5,
  maxGroups: 2,
  maxVideo: 0,
  prisonCode: '',
  prisonTimeSlotId: 0,
  hasVisit,
  createdBy: '',
  createdTime: '',
})
describe('DeleteLocationHandler', () => {
  describe('GET', () => {
    it('renders delete confirmation page', async () => {
      officialVisitsService.getVisitSlot.mockResolvedValue(visitSlot(false))

      const res = await request(app).get('/admin/locations/time-slot/1/visit-slot/11/delete')

      expect(res.status).toBe(200)
      expect(res.text).toContain('Are you sure you want to delete this location')
      expect(res.text).toContain('Location 1')
      expect(res.text).toContain('Location')
      expect(res.text).toContain('Maximum Adults')
      expect(res.text).toContain('Maximum Groups')
      expect(res.text).toContain('Maximum Video Visits')
      expect(res.text).toContain('5')
      expect(res.text).toContain('2')
      expect(res.text).toContain('0')
      expect(res.text).toContain('Delete')
      expect(res.text).toContain('Cancel and return to schedule')
    })

    it('throws error if visit slot has visits booked', async () => {
      officialVisitsService.getVisitSlot.mockResolvedValue(visitSlot(true))

      await request(app).get('/admin/locations/time-slot/1/visit-slot/11/delete').expect(500)

      expect(officialVisitsService.getVisitSlot).toHaveBeenCalledWith(11, adminUser)
    })
  })

  describe('POST', () => {
    it('deletes and redirects on success', async () => {
      officialVisitsService.getVisitSlot.mockResolvedValue(visitSlot(false))
      officialVisitsService.deleteVisitSlot.mockResolvedValue({})

      await request(app).post('/admin/locations/time-slot/1/visit-slot/11/delete').send({}).expect(302)

      expect(officialVisitsService.deleteVisitSlot).toHaveBeenCalledWith(11, adminUser)
    })

    it('throws error if visit slot has visits booked', async () => {
      officialVisitsService.getVisitSlot.mockResolvedValue(visitSlot(true))

      await request(app).post('/admin/locations/time-slot/1/visit-slot/11/delete').send({}).expect(500)

      expect(officialVisitsService.getVisitSlot).toHaveBeenCalledWith(11, adminUser)
    })
  })
})
