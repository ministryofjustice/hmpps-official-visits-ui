import nock from 'nock'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import OfficialVisitsApiClient from './officialVisitsApiClient'
import config from '../config'
import { HmppsUser } from '../interfaces/hmppsUser'

describe('OfficialVisitsApiClient', () => {
  let officialVisitsApiClient: OfficialVisitsApiClient
  let mockAuthenticationClient: jest.Mocked<AuthenticationClient>

  const user = { token: 'userToken', username: 'test' } as HmppsUser

  beforeEach(() => {
    mockAuthenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>

    officialVisitsApiClient = new OfficialVisitsApiClient(mockAuthenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  describe('getOfficialVisitById', () => {
    it('should get an official visit by ID and return the response body', async () => {
      const visitId = 1
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .get(`/official-visits/${visitId}`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.getOfficialVisitById(visitId, user)

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })
})
