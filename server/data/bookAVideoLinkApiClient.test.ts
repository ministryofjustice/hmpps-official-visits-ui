import nock from 'nock'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import { HmppsUser } from '../interfaces/hmppsUser'
import BookAVideoLinkApiClient from './bookAVideoLinkApiClient'

describe('BookAVideoLinkApiClient', () => {
  let bookAVideoLinkApiClient: BookAVideoLinkApiClient
  let mockAuthenticationClient: jest.Mocked<AuthenticationClient>

  const user = { token: 'userToken', username: 'test' } as HmppsUser

  beforeEach(() => {
    mockAuthenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>

    bookAVideoLinkApiClient = new BookAVideoLinkApiClient(mockAuthenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  describe('GET', () => {
    it('should return BVLS enabled prisons', async () => {
      const expected = { data: 'data' }

      nock(config.apis.bookAVideoLinkApi.url)
        .get(`/prisons/list?enabledOnly=true`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)
      const result = await bookAVideoLinkApiClient.getPrisons(user)

      expect(result).toEqual(expected)
    })
  })
})
