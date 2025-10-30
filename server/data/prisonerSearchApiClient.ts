import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import { AttributeSearchRequest, PagePrisoner, PaginationRequest, Prisoner } from '../@types/prisonerSearchApi/types'

export default class PrisonerSearchApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Prisoner Search API Client', config.apis.prisonerSearchApi, logger, authenticationClient)
  }

  getPrisonerByPrisonerNumber(prisonerNumber: string, user: HmppsUser): Promise<Prisoner> {
    return this.get<Prisoner>({ path: `/prisoner/${prisonerNumber}` }, asSystem(user.username))
  }

  async getByAttributes(
    attributeSearchRequest: AttributeSearchRequest,
    user: HmppsUser,
    pagination?: PaginationRequest,
    sortBy?: { attribute: string; order: 'ASC' | 'DESC' },
  ): Promise<PagePrisoner> {
    const paginationParams = pagination ?? {}
    const sortParams = sortBy ? [sortBy.attribute, sortBy.order === 'DESC' ? 'DESC' : 'ASC'] : undefined

    return this.post(
      {
        path: `/attribute-search`,
        data: attributeSearchRequest,
        query: { ...paginationParams, ...(sortParams && { sort: sortParams }) },
      },
      asSystem(user.username),
    )
  }
}
