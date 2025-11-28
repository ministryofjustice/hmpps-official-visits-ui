import { format } from 'date-fns'
import ActivitiesApiClient from '../data/activitiesApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { ScheduledEvent } from '../@types/activitiesApi/types'

export default class ActivitiesService {
  constructor(private readonly activitiesApiClient: ActivitiesApiClient) {}

  async getPrisonersSchedule(
    prisonCode: string,
    date: string,
    prisonerNumbers: string[],
    user: HmppsUser,
  ): Promise<ScheduledEvent[]> {
    const scheduledEvents = await this.activitiesApiClient.getScheduledEventsByPrisonerNumbers(
      prisonCode,
      format(date, 'yyyy-MM-dd'),
      prisonerNumbers,
      user,
    )
    const { appointments, courtHearings, visits, activities, externalTransfers, adjudications } = scheduledEvents
    const events = [...appointments, ...courtHearings, ...visits, ...activities, ...externalTransfers, ...adjudications]

    // filter cancelled
    const activeEvents = events?.filter(event => event.cancelled === false)
    // sort it based on start time
    return activeEvents?.sort((a, b) => {
      const [ah, am] = a.startTime.split(':').map(Number)
      const [bh, bm] = b.startTime.split(':').map(Number)
      return ah !== bh ? ah - bh : am - bm
    })
  }
}
