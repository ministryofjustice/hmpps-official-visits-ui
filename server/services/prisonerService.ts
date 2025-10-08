import PrisonerSearchApiClient from '../data/prisonerSearchApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { Prisoner } from '../@types/prisonerSearchApi/types'

export default class PrisonerService {
  constructor(private readonly prisonerSearchApiClient: PrisonerSearchApiClient) {}

  public async getPrisonerByPrisonerNumber(prisonerNumber: string, user: HmppsUser): Promise<Prisoner> {
    return this.prisonerSearchApiClient.getPrisonerByPrisonerNumber(prisonerNumber, user)
  }
}
