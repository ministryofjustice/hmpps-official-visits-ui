import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import { PagePrisoner, PaginationRequest, Prisoner } from '../@types/prisonerSearchApi/types'

export default class PrisonerSearchApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Prisoner Search API Client', config.apis.prisonerSearchApi, logger, authenticationClient)
  }

  getPrisonerByPrisonerNumber(prisonerNumber: string, user: HmppsUser): Promise<Prisoner> {
    return this.get<Prisoner>({ path: `/prisoner/${prisonerNumber}` }, asSystem(user.username))
  }

  async searchInCaseload(
    searchTerm: string,
    prisonId: string,
    user: HmppsUser,
    pagination?: PaginationRequest,
  ): Promise<PagePrisoner> {
    const paginationParameters = pagination ?? { page: 0, size: config.apis.prisonerSearchApi.pageSize || 10 }
    return this.get(
      {
        path: `/prison/${prisonId}/prisoners`,
        query: { term: searchTerm, ...paginationParameters },
      },
      asSystem(user.username),
    )
  }
}
