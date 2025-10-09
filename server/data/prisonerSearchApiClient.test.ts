import nock from 'nock'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import PrisonerSearchApiClient from './prisonerSearchApiClient'
import config from '../config'
import { HmppsUser } from '../interfaces/hmppsUser'

describe('PrisonerSearchApiClient', () => {
  let prisonerSearchApiClient: PrisonerSearchApiClient
  let mockAuthenticationClient: jest.Mocked<AuthenticationClient>

  const user = { token: 'userToken', username: 'test' } as HmppsUser

  beforeEach(() => {
    mockAuthenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>

    prisonerSearchApiClient = new PrisonerSearchApiClient(mockAuthenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  describe('get prisoner by prisoner number', () => {
    it('should get a prisoner by prisoner number and return the response body', async () => {
      const prisonerNumber = 'A1111AA'
      const expected = { data: 'data' }

      nock(config.apis.prisonerSearchApi.url)
        .get(`/prisoner/${prisonerNumber}`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await prisonerSearchApiClient.getPrisonerByPrisonerNumber(prisonerNumber, user)

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })
})
