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
      const prisonCode = 'AAA'
      const visitId = 1
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .get(`/official-visit/prison/${prisonCode}/id/${visitId}`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.getOfficialVisitById('AAA', visitId, user)

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('getApprovedOfficialContacts', () => {
    it('should get a list of approved official contacts for a prisoner', async () => {
      const prisonerNumber = 'A1234AA'
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .get(`/prisoner/${prisonerNumber}/approved-relationships?relationshipType=O`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.getApprovedOfficialContacts('MDI', prisonerNumber, user)

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('getApprovedSocialContacts', () => {
    it('should get a list of approved social contacts for a prisoner', async () => {
      const prisonerNumber = 'A1234AA'
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .get(`/prisoner/${prisonerNumber}/approved-relationships?relationshipType=S`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.getApprovedSocialContacts('MDI', prisonerNumber, user)

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })
})
