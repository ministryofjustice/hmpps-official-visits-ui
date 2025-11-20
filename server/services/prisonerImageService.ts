import { Readable } from 'stream'
import PrisonApiClient from '../data/prisonApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'

export default class PrisonerImageService {
  constructor(private readonly prisonApiClient: PrisonApiClient) {}

  getImage(prisonerNumber: string, user: HmppsUser): Promise<Readable> {
    return this.prisonApiClient.getImage(prisonerNumber, user)
  }
}
