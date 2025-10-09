import LocationsInPrisonApiClient from '../data/locationsInPrisonApiClient'
import LocationsService from './locationsService'
import { HmppsUser } from '../interfaces/hmppsUser'
import { Location } from '../@types/locationsInPrisonApi/types'

jest.mock('../data/locationsInPrisonApiClient')

const user = { token: 'userToken', username: 'test' } as HmppsUser

describe('LocationsService', () => {
  let locationsInPrisonApiClient: jest.Mocked<LocationsInPrisonApiClient>
  let locationsService: LocationsService

  beforeEach(() => {
    locationsInPrisonApiClient = new LocationsInPrisonApiClient(null) as jest.Mocked<LocationsInPrisonApiClient>
    locationsService = new LocationsService(locationsInPrisonApiClient)
  })

  it('should call get location on the locations API client and return its result', async () => {
    const dpsLocationId = 'test'
    const expected = {
      id: 'test',
      prisonId: 'MDI',
      code: 'MDI-1-1-1',
      pathHierarchy: 'AREA',
      locationType: 'ROOM',
      isResidential: false,
    } as Location

    locationsInPrisonApiClient.getLocationById.mockResolvedValue(expected)

    const result = await locationsService.getLocationById(dpsLocationId, user)

    expect(locationsInPrisonApiClient.getLocationById).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })
})
