import { Readable } from 'stream'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'

export default class PrisonApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Prisoner  API Client', config.apis.prisonApi, logger, authenticationClient)
  }

  async getImage(prisonerNumber: string, user: HmppsUser): Promise<Readable> {
    return this.stream({ path: `/api/bookings/offenderNo/${prisonerNumber}/image/data` }, asSystem(user.username))
  }
}
