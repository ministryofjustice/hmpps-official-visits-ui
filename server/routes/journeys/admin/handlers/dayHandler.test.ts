import { type Express } from 'express'
import request from 'supertest'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import { allSlots } from '../../../../testutils/mocks'
import { TimeSlotSummaryItem } from '../../../../@types/officialVisitsApi/types'

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
    expect(res.text).toContain('Add a new time')
    // assert links
    expect(res.text).toContain('href="/admin/locations/time-slot/1/location">Manage locations</a>')
    expect(res.text).toContain('href="/admin/locations/time-slot/1/edit?day=MON">Edit</a>')
  })

  it('should render time slots sorted by start time within each day', async () => {
    // Create a deep copy of allSlots and reorder the Monday slots to be unsorted
    const unsorted = JSON.parse(JSON.stringify(allSlots))

    // Extract Monday slots and reverse their order (make 11:00 come before 09:00)
    const mondaySlots = unsorted.timeSlots.filter((s: TimeSlotSummaryItem) => s.timeSlot.dayCode === 'MON')
    const nonMonday = unsorted.timeSlots.filter((s: TimeSlotSummaryItem) => s.timeSlot.dayCode !== 'MON')

    // Put Monday slots in reverse order at the start
    unsorted.timeSlots = [mondaySlots[1], ...nonMonday, mondaySlots[0]]

    officialVisitsService.getVisitSlotsAtPrison.mockResolvedValue(unsorted)

    const res = await request(app).get(`/admin/days`)

    expect(res.status).toBe(200)

    // Ensure both times exist
    expect(res.text).toContain('09:00')
    expect(res.text).toContain('11:00')

    // Assert that 09:00 appears before 11:00 in the rendered HTML
    const firstIndex = res.text.indexOf('09:00')
    const secondIndex = res.text.indexOf('11:00')
    expect(firstIndex).toBeLessThan(secondIndex)
  })
})
