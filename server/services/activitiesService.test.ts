import ActivitiesApiClient from '../data/activitiesApiClient'
import ActivitiesService from './activitiesService'
import { HmppsUser } from '../interfaces/hmppsUser'
import { PrisonerScheduledEvents } from '../@types/activitiesApi/types'

jest.mock('../data/activitiesApiClient')

const user = { token: 'userToken', username: 'test' } as HmppsUser

describe('Activities Service ', () => {
  let activitiesApiClient: jest.Mocked<ActivitiesApiClient>
  let activitiesService: ActivitiesService

  beforeEach(() => {
    activitiesApiClient = new ActivitiesApiClient(null) as jest.Mocked<ActivitiesApiClient>
    activitiesService = new ActivitiesService(activitiesApiClient)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should should return prisoner schedule', async () => {
    const prisonCode = 'MIC'
    const prisonerNumbers = ['ABC123']
    const date = '2022-10-01'
    const response = {
      prisonCode,
      prisonerNumbers,
      startDate: date,
      endDate: date,
      appointments: [],
      courtHearings: [],
      visits: [],
      activities: [],
      externalTransfers: [],
      adjudications: [],
    } as PrisonerScheduledEvents

    activitiesApiClient.getScheduledEventsByPrisonerNumbers.mockResolvedValue(response)
    const result = await activitiesService.getPrisonersSchedule(prisonCode, date, prisonerNumbers, user)
    expect(activitiesApiClient.getScheduledEventsByPrisonerNumbers).toHaveBeenCalledTimes(1)
    expect(result).toEqual([])
  })
})
