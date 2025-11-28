import { format } from 'date-fns'
import ActivitiesApiClient from '../data/activitiesApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { ScheduledEvent } from '../@types/activitiesApi/types'
import logger from '../../logger'

export default class ActivitiesService {
  constructor(private readonly activitiesApiClient: ActivitiesApiClient) {}

  async getScheduledEventsByPrisonerNumbers(
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
    logger.info(`Events : ${JSON.stringify(scheduledEvents, null, 2)}`)
    const { appointments, courtHearings, visits, activities, externalTransfers, adjudications } = scheduledEvents
    const events = [...appointments, ...courtHearings, ...visits, ...activities, ...externalTransfers, ...adjudications]
    logger.info(`Events : ${JSON.stringify(events, null, 2)}`)

    // filter cancelled
    const activeEvent = events?.filter(event => event.cancelled === false)
    logger.info(`Events : ${JSON.stringify(activeEvent, null, 2)}`)

    // sort it based on start time
    return activeEvent?.sort((a, b) => {
      const [ah, am] = a.startTime.split(':').map(Number)
      const [bh, bm] = b.startTime.split(':').map(Number)
      return ah !== bh ? ah - bh : am - bm
    })
  }
}
