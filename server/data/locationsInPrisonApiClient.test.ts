import nock from 'nock'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import LocationsInPrisonApiClient from './locationsInPrisonApiClient'
import config from '../config'
import { HmppsUser } from '../interfaces/hmppsUser'

describe('LocationsInPrisonApiClient', () => {
  let locationsApiClient: LocationsInPrisonApiClient
  let mockAuthenticationClient: jest.Mocked<AuthenticationClient>

  const user = { token: 'userToken', username: 'test' } as HmppsUser

  beforeEach(() => {
    mockAuthenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>

    locationsApiClient = new LocationsInPrisonApiClient(mockAuthenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  describe('getLocationById', () => {
    it('should get a location by dpsLocationId and return the response body', async () => {
      const dpsLocationId = 'any-location-code'
      const expected = { data: 'data' }

      nock(config.apis.locationsInsidePrisonApi.url)
        .get(`/locations/${dpsLocationId}`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await locationsApiClient.getLocationById(dpsLocationId, user)

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })
})
