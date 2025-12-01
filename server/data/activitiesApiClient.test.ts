import nock from 'nock'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import ActivitiesApiClient from './activitiesApiClient'
import config from '../config'
import { HmppsUser } from '../interfaces/hmppsUser'
import { PrisonerScheduledEvents } from '../@types/activitiesApi/types'

describe('ActivitiesApiClient', () => {
  let activitiesApiClient: ActivitiesApiClient
  let mockAuthenticationClient: jest.Mocked<AuthenticationClient>

  const user = { token: 'userToken', username: 'test' } as HmppsUser

  beforeEach(() => {
    mockAuthenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>

    activitiesApiClient = new ActivitiesApiClient(mockAuthenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  describe('Get Scheduled Events By PrisonerNumbers', () => {
    it('should return prisoner schedule', async () => {
      const prisonCode = 'MIC'
      const prisonerNumbers = ['ABC123']
      const date = '2022-10-01'
      const response = {
        prisonCode,
        prisonerNumbers,
        startDate: date,
        endDate: date,
        appointments: [],
        activities: [],
        visits: [],
        courtHearings: [],
      } as PrisonerScheduledEvents

      nock(config.apis.activitiesApi.url)
        .post(`/scheduled-events/prison/MIC?date=2022-10-01`, prisonerNumbers)
        .matchHeader('authorization', 'Bearer userToken')
        .reply(200, response)
      const result = await activitiesApiClient.getScheduledEventsByPrisonerNumbers(
        prisonCode,
        date,
        prisonerNumbers,
        user,
      )
      expect(result).toEqual(response)
    })
  })
})
