import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { RestClient, asUser } from '@ministryofjustice/hmpps-rest-client'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import { PrisonerScheduledEvents } from '../@types/activitiesApi/types'

export default class ActivitiesApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Activities  API Client', config.apis.activitiesApi, logger, authenticationClient)
  }

  async getScheduledEventsByPrisonerNumbers(
    prisonCode: string,
    date: string,
    prisonerNumbers: string[],
    user: HmppsUser,
  ): Promise<PrisonerScheduledEvents> {
    return this.post(
      {
        path: `/scheduled-events/prison/${prisonCode}`,
        query: { date },
        data: prisonerNumbers,
      },
      asUser(user.token),
    )
  }
}
