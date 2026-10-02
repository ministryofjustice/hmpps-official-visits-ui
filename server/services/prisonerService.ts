import PrisonerSearchApiClient from '../data/prisonerSearchApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { PagePrisoner, Prisoner, PaginationRequest } from '../@types/prisonerSearchApi/types'

export default class PrisonerService {
  constructor(private readonly prisonerSearchApiClient: PrisonerSearchApiClient) {}

  public async getPrisonerByPrisonerNumber(prisonerNumber: string, user: HmppsUser): Promise<Prisoner> {
    return this.prisonerSearchApiClient.getPrisonerByPrisonerNumber(prisonerNumber, user)
  }

  public async searchInCaseload(
    searchTerm: string,
    prisonId: string,
    user: HmppsUser,
    pagination?: PaginationRequest,
  ): Promise<PagePrisoner> {
    return this.prisonerSearchApiClient.searchInCaseload(searchTerm, prisonId, user, pagination)
  }
}
