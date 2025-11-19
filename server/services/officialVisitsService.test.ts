import OfficialVisitsApiClient from '../data/officialVisitsApiClient'
import OfficialVisitsService from './officialVisitsService'
import { HmppsUser } from '../interfaces/hmppsUser'
import { OfficialVisit } from '../@types/officialVisitsApi/types'

jest.mock('../data/officialVisitsApiClient')

const user = { token: 'userToken', username: 'test' } as HmppsUser

describe('OfficialVisitsService', () => {
  let officialVisitsApiClient: jest.Mocked<OfficialVisitsApiClient>
  let officialVisitsService: OfficialVisitsService

  beforeEach(() => {
    officialVisitsApiClient = new OfficialVisitsApiClient(null) as jest.Mocked<OfficialVisitsApiClient>
    officialVisitsService = new OfficialVisitsService(officialVisitsApiClient)
  })

  it('should call get offical visits by ID on the official visits API client and return its result', async () => {
    const visitId = 1
    const expected = {
      officialVisitId: 1,
      prisonCode: 'MDI',
      prisonName: 'Moorland (HMP)',
      prisonerNumber: 'A1111AA',
      visitStatusCode: 'SCH',
      visitStatusDescription: 'Scheduled',
      visitType: 'VIDEO',
      visitTypeDescription: 'Video visit',
      visitDate: '2025-12-10',
      startTime: '10:15',
      endTime: '11:15',
      visitSlotId: 1,
      timeSlotId: 1,
      dpsLocationId: 'fake-location-code',
      staffNotes: 'staff notes',
      prisonerNotes: 'prisoner notes',
    } as OfficialVisit

    officialVisitsApiClient.getOfficialVisitById.mockResolvedValue(expected)

    const result = await officialVisitsService.getOfficialVisitById(visitId, user)

    expect(officialVisitsApiClient.getOfficialVisitById).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })
})
