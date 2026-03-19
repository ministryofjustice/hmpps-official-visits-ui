import request from 'supertest'
import type { Express } from 'express'
import cheerio from 'cheerio'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import OfficialVisitsService from '../../../../services/officialVisitsService'
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

describe('LocationHandler', () => {
  it('renders locations page for matching time slot', async () => {
    const timeSlotId = 123

    officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue({
      timeSlots: [
        {
          timeSlot: { prisonTimeSlotId: timeSlotId, dayCode: 'MON', startTime: '09:00', endTime: '10:00' },
          visitSlots: [{ visitSlotId: 1, locationDescription: 'Room 1', maxAdults: 2, maxGroups: 1, maxVideo: 0 }],
        },
      ],
    } as TimeSlotSummary)

    const res = await request(app).get(`/admin/locations/time-slot/${timeSlotId}/location`)

    expect(res.status).toBe(200)
    expect(res.text).toContain('Locations for time slot')
    expect(res.text).toContain('Room 1')
    expect(res.text).toContain('Maximum Adults')
    expect(res.text).toContain(`/admin/locations/time-slot/${timeSlotId}/visit-slot/new`)
    expect(res.text).toContain('<a href="/admin/days#monday" class="govuk-back-link">Back</a>')
    const $ = cheerio.load(res.text)
    const cancelAnchor = $('a[href="/admin/days#monday"]').eq(1)
    const cancelText = cancelAnchor.text().replace(/\s+/g, ' ').trim()
    expect(cancelText).toBe('Return to schedule day view')
  })

  it('should show no time slots when no matching time slot', async () => {
    const timeSlotId = 999

    officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue({ timeSlots: [] } as TimeSlotSummary)

    const res = await request(app).get(`/admin/locations/time-slot/${timeSlotId}/location`)

    expect(res.status).toBe(200)
    expect(res.text).toContain('No locations')
  })
})
