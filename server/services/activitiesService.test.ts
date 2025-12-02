import ActivitiesApiClient from '../data/activitiesApiClient'
import ActivitiesService from './activitiesService'
import { HmppsUser } from '../interfaces/hmppsUser'
import { PrisonerScheduledEvents } from '../@types/activitiesApi/types'
import { mockScheduleEvents, sortedMockScheduleEvents } from '../testutils/mocks'

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

  it('should should return prisoner schedule with empty start time displayed in the end', async () => {
    const prisonCode = 'MIC'
    const prisonerNumber = 'ABC123'
    const date = '2022-10-01'
    const response = {
      prisonCode,
      prisonerNumbers: [prisonerNumber],
      startDate: date,
      endDate: date,
      appointments: mockScheduleEvents,
      courtHearings: [],
      visits: [],
      activities: [],
      externalTransfers: [],
      adjudications: [],
    } as PrisonerScheduledEvents

    activitiesApiClient.getScheduledEventsByPrisonerNumbers.mockResolvedValue(response)
    const result = await activitiesService.getPrisonersSchedule(prisonCode, date, prisonerNumber, user)
    expect(result).toEqual(sortedMockScheduleEvents)
    expect(activitiesApiClient.getScheduledEventsByPrisonerNumbers).toHaveBeenCalledTimes(1)
  })
})
