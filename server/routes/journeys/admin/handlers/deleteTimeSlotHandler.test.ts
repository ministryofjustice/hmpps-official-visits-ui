import type { Express } from 'express'
import request from 'supertest'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import AuditService from '../../../../services/auditService'
import type { TimeSlotSummary, TimeSlot, VisitSlot } from '../../../../@types/officialVisitsApi/types'

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

const prisonTimeSlot = (id: number = 1): TimeSlot => ({
  prisonTimeSlotId: id,
  prisonCode: 'MDI',
  dayCode: 'MON',
  startTime: '09:00',
  endTime: '10:00',
  effectiveDate: '2026-01-01',
  createdBy: 'creator',
  createdTime: '2026-01-01T00:00:00',
})

const visitSlot = (hasVisit: boolean = true): VisitSlot => ({
  visitSlotId: 11,
  dpsLocationId: 'loc-1',
  locationDescription: 'Location 1',
  maxAdults: 5,
  maxGroups: 2,
  maxVideo: 0,
  prisonCode: 'MDI',
  prisonTimeSlotId: 1,
  hasVisit,
  createdBy: '',
  createdTime: '',
})

describe('DeleteTimeSlotHandler', () => {
  describe('GET', () => {
    it('renders delete confirmation page', async () => {
      officialVisitsService.getPrisonTimeSlotById.mockResolvedValue(prisonTimeSlot(1))

      const res = await request(app).get('/admin/locations/time-slot/1/delete')

      expect(res.status).toBe(200)
      expect(res.text).toContain('Are you sure you want to delete this visiting time')
      expect(res.text).toContain('Delete')
      expect(res.text).toContain('Cancel and return to schedule')
      expect(res.text).toContain('<a href="/admin/days#monday" class="govuk-back-link">Back</a>')
      expect(res.text).toContain(
        '<a href="/admin/days#monday" class="govuk-link govuk-!-margin-left-4">Cancel and return to schedule</a>',
      )
    })

    it('throws error if getPrisonTimeSlotById fails', async () => {
      officialVisitsService.getPrisonTimeSlotById.mockRejectedValue(new Error('boom'))

      await request(app).get('/admin/locations/time-slot/1/delete').expect(500)

      expect(officialVisitsService.getPrisonTimeSlotById).toHaveBeenCalledWith(1, adminUser)
    })
  })

  describe('POST', () => {
    it('deletes and redirects on success', async () => {
      const noVisitSlots: TimeSlotSummary = {
        prisonCode: 'MDI',
        prisonName: 'Moorland (HMP & YOI)',
        timeSlots: [{ timeSlot: { ...prisonTimeSlot(1) }, visitSlots: [] }],
      }
      officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(noVisitSlots)
      officialVisitsService.deleteTimeSlot.mockResolvedValue({} as unknown as TimeSlot)

      await request(app).post('/admin/locations/time-slot/1/delete').send({}).expect(302)

      expect(officialVisitsService.getVisitSlotsAtPrison).toHaveBeenCalledWith(expect.any(String), adminUser)
      expect(officialVisitsService.deleteTimeSlot).toHaveBeenCalledWith(1, adminUser)
    })

    it('throws error if time slot has visit slots', async () => {
      const withVisitSlots: TimeSlotSummary = {
        prisonCode: 'MDI',
        prisonName: 'Moorland (HMP & YOI)',
        timeSlots: [{ timeSlot: { ...prisonTimeSlot(1) }, visitSlots: [visitSlot(true)] }],
      }
      officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(withVisitSlots)

      await request(app).post('/admin/locations/time-slot/1/delete').send({}).expect(500)

      expect(officialVisitsService.getVisitSlotsAtPrison).toHaveBeenCalledWith(expect.any(String), adminUser)
    })
  })
})
