import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import { Prison } from '../@types/bookAVideoLinkApi/types'

export default class BookAVideoLinkApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Book a video link API client', config.apis.bookAVideoLinkApi, logger, authenticationClient)
  }

  async getPrisons(user: HmppsUser): Promise<Prison[]> {
    return this.get<Prison[]>(
      {
        path: `/prisons/list`,
        query: {
          enabledOnly: true,
        },
      },
      asSystem(user.username),
    )
  }
}
