import nock from 'nock'
import { RestClient } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { Readable } from 'stream'
import PrisonApiClient from './prisonApiClient'
import config from '../config'
import { HmppsUser } from '../interfaces/hmppsUser'

describe('Prison api client tests', () => {
  let prisonApiClient: PrisonApiClient
  let mockAuthenticationClient: jest.Mocked<AuthenticationClient>

  const user = { token: 'userToken', username: 'test' } as HmppsUser
  const stream = jest.spyOn(RestClient.prototype, 'stream')

  beforeEach(() => {
    mockAuthenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>
    prisonApiClient = new PrisonApiClient(mockAuthenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  it('Get prisoner image', async () => {
    stream.mockResolvedValue(Readable.from('image'))
    nock(config.apis.prisonApi.url)
      .get(`/api/bookings/offenderNo/ABC1234/image/data`)
      .matchHeader('authorization', 'Bearer test-system-token')
      .reply(200, stream)
    const result = await prisonApiClient.getImage('ABC1234', user)
    expect(result.read()).toEqual('image')
  })
})
