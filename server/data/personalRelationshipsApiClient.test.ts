import nock from 'nock'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import PersonalRelationshipsApiClient from './personalRelationshipsApiClient'
import config from '../config'
import { HmppsUser } from '../interfaces/hmppsUser'

describe('Contacts api client tests', () => {
  let personalRelationshipsApiClient: PersonalRelationshipsApiClient
  let mockAuthenticationClient: jest.Mocked<AuthenticationClient>

  const user = { token: 'userToken', username: 'test' } as HmppsUser

  beforeEach(() => {
    mockAuthenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>
    personalRelationshipsApiClient = new PersonalRelationshipsApiClient(mockAuthenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  it('Get prisoner contacts restrictions', async () => {
    const expected = { data: 'data' }
    nock(config.apis.personalRelationshipsApi.url)
      .get(`/prisoner-restrictions/ABC1234?page=0&size=10&currentTerm=false&paged=false`)
      .matchHeader('authorization', 'Bearer test-system-token')
      .reply(200, expected)
    const result = await personalRelationshipsApiClient.getPrisonerRestrictions('ABC1234', 0, 10, user, false, false)
    expect(result).toEqual(expected)
    expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
  })
})
