import LocationsInPrisonApiClient from '../data/locationsInPrisonApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { Location } from '../@types/locationsInPrisonApi/types'

export default class LocationsService {
  constructor(private readonly locationsApiClient: LocationsInPrisonApiClient) {}

  public async getLocationById(dpsLocationId: string, user: HmppsUser): Promise<Location> {
    return this.locationsApiClient.getLocationById(dpsLocationId, user)
  }
}
