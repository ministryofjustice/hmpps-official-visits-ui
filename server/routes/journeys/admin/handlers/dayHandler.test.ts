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

describe('DayHandler', () => {
  it('should fetch all time slots and render the days page with slots split by day', async () => {
    officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(allSlots)

    const res = await request(app).get(`/admin/days`)

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
    expect(res.text).toContain('Add Monday time')
    expect(res.text).toContain('Add Tuesday time')
    expect(res.text).toContain('Set end date for all Monday visit times')
    expect(res.text).toContain('Set end date for all Tuesday visit times')
    // assert links
    expect(res.text).toContain('href="/admin/locations/time-slot/1/location">Manage locations</a>')
    expect(res.text).toContain('href="/admin/locations/time-slot/1/edit?day=MON">Edit</a>')
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
            prisonTimeSlotId: 3,
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

    const res = await request(app).get(`/admin/days`)

    expect(res.status).toBe(200)

    // The Monday slots should be sorted by start time: 09:00, 13:30, 16:00
    const mondayText = res.text.match(/Monday[\s\S]*?Tuesday/m)?.[0] || ''
    const lines = mondayText.split('\n')

    // Find the table rows for Monday (look for the start times in order)
    const startTimeLines = lines.filter(line => line.match(/\d{2}:\d{2}/))

    // The times should appear in sorted order
    expect(res.text).toMatch(/09:00[\s\S]*13:30[\s\S]*16:00/)
  })
})
