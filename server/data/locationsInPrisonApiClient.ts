import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import { Location } from '../@types/locationsInPrisonApi/types'

export default class LocationsInPrisonApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Locations Inside Prison API', config.apis.locationsInsidePrisonApi, logger, authenticationClient)
  }

  getLocationById(dpsLocationId: string, user: HmppsUser): Promise<Location> {
    return this.get<Location>({ path: `/locations/${dpsLocationId}` }, asSystem(user.username))
  }
}
