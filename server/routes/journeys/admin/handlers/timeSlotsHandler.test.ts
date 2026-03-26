import { type Express } from 'express'
import request from 'supertest'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import { allSlots } from '../../../../testutils/mocks'
import { TimeSlotSummary } from '../../../../@types/officialVisitsApi/types'

jest.mock('../../../../services/officialVisitsService')

const officialVisitsService = new OfficialVisitsService(null) as jest.Mocked<OfficialVisitsService>

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({ services: { officialVisitsService }, userSupplier: () => adminUser })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('TimeSlotsHandler', () => {
  it('should fetch all time slots and render the days page with slots split by day', async () => {
    officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(allSlots)

    const res = await request(app).get(`/admin/time-slots`)

    expect(officialVisitsService.getVisitSlotsAtPrison).toHaveBeenCalledWith('HEI', adminUser)
    expect(res.status).toBe(200)
    expect(res.text).toContain('Time slots for official visits')
    expect(res.text).toContain(
      'Setting an end date for all visit times will not effect existing visits scheduled for the time and locations.',
    )
    expect(res.text).toContain('Monday')
    expect(res.text).toContain('Tuesday')
    expect(res.text).toContain('09:00')
    expect(res.text).toContain('10:00')
    expect(res.text).toContain('11:00')
    expect(res.text).toContain('12:00')
    expect(res.text).toContain('1 January 2025')
    expect(res.text).toContain('2 January 2025')
    expect(res.text).toContain('3 January 2025')
    expect(res.text).toContain('Manage locations')
    expect(res.text).toContain('Add a new time')
    // assert links
    expect(res.text).toContain('href="/admin/time-slot/1/locations">Manage locations</a>')
    expect(res.text).toContain('href="/admin/time-slot/1/edit?day=MON">Edit</a>')
  })

  it('should sort time slots by start time within each day', async () => {
    const unsortedSlots: TimeSlotSummary = {
      prisonCode: 'MDI',
      prisonName: 'Mock Prison',
      timeSlots: [
        {
          timeSlot: {
            dayCode: 'MON',
            prisonTimeSlotId: 1,
            startTime: '13:30',
            endTime: '14:30',
            effectiveDate: '2025-01-01',
            expiryDate: '2056-12-31',
            prisonCode: 'MDI',
            createdBy: 'BP',
            createdTime: '2025-01-01T09:00:00',
          },
          visitSlots: [],
        },
        {
          timeSlot: {
            dayCode: 'MON',
            prisonTimeSlotId: 2,
            startTime: '09:00',
            endTime: '11:45',
            effectiveDate: '2025-01-01',
            expiryDate: '2056-12-31',
            prisonCode: 'MDI',
            createdBy: 'BP',
            createdTime: '2025-01-01T09:00:00',
          },
          visitSlots: [],
        },
        {
          timeSlot: {
            dayCode: 'MON',
            prisonTimeSlotId: 3,
            startTime: '09:00',
            endTime: '10:00',
            effectiveDate: '2025-01-01',
            expiryDate: '2056-12-31',
            prisonCode: 'MDI',
            createdBy: 'BP',
            createdTime: '2025-01-01T09:00:00',
          },
          visitSlots: [],
        },
        {
          timeSlot: {
            dayCode: 'MON',
            prisonTimeSlotId: 4,
            startTime: '16:00',
            endTime: '17:00',
            effectiveDate: '2025-01-01',
            expiryDate: '2056-12-31',
            prisonCode: 'MDI',
            createdBy: 'BP',
            createdTime: '2025-01-01T09:00:00',
          },
          visitSlots: [],
        },
      ],
    }

    officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(unsortedSlots)

    const res = await request(app).get(`/admin/time-slots`)

    expect(res.status).toBe(200)

    expect(res.text).toMatch(/09:00[\s\S]*10:00[\s\S]*09:00[\s\S]*11:45[\s\S]*13:30[\s\S]*16:00/)
  })
})
