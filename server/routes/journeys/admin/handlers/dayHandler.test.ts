import { type Express } from 'express'
import request from 'supertest'
import OfficialVisitsService from '../../../../services/officialVisitsService'
import { adminUser, appWithAllRoutes } from '../../../testutils/appSetup'
import { allSlots } from '../../../../testutils/mocks'

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
})
