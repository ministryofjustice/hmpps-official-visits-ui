import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import { PagedModelPrisonerRestrictionDetails } from '../@types/personalRelationshipsApi/types'

export default class PersonalRelationshipsApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Personal relationships  API Client', config.apis.personalRelationshipsApi, logger, authenticationClient)
  }

  async getPrisonerRestrictions(
    prisonerNumber: string,
    page: number,
    size: number,
    user: HmppsUser,
    currentTerm: boolean,
    paged: boolean,
  ): Promise<PagedModelPrisonerRestrictionDetails> {
    return this.get<PagedModelPrisonerRestrictionDetails>(
      {
        path: `/prisoner-restrictions/${prisonerNumber}?page=${page}&size=${size}&currentTerm=${currentTerm}&paged=${paged}`,
      },
      asSystem(user.username),
    )
  }
}
