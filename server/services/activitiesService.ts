import { format } from 'date-fns'
import ActivitiesApiClient from '../data/activitiesApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { ScheduledEvent } from '../@types/activitiesApi/types'

export default class ActivitiesService {
  constructor(private readonly activitiesApiClient: ActivitiesApiClient) {}

  async getPrisonersSchedule(
    prisonCode: string,
    date: string,
    prisonerNumber: string,
    user: HmppsUser,
  ): Promise<ScheduledEvent[]> {
    const scheduledEvents = await this.activitiesApiClient.getScheduledEventsByPrisonerNumbers(
      prisonCode,
      format(date, 'yyyy-MM-dd'),
      [prisonerNumber],
      user,
    )

    const { appointments, courtHearings, visits, activities, externalTransfers, adjudications } = scheduledEvents
    const events = [...appointments, ...courtHearings, ...visits, ...activities, ...externalTransfers, ...adjudications]

    // filter cancelled
    const activeEvents = events?.filter(event => event.cancelled === false)
    // to handle null/empty startTime
    const toMinutes = (time: string | null | undefined): number => {
      // return largest possible number so that it displayed at the end of list
      if (!time) return Number.POSITIVE_INFINITY
      const [h, m] = time.split(':').map(Number)
      // convert time to minutes
      return h * 60 + m
    }

    // sort it based on start time
    return activeEvents?.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
  }
}
