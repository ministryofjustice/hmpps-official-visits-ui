import PersonalRelationshipsApiClient from '../data/personalRelationshipsApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { PagedModelPrisonerRestrictionDetails } from '../@types/personalRelationshipsApi/types'

export default class PersonalRelationshipsService {
  constructor(private readonly personalRelationshipsApiClient: PersonalRelationshipsApiClient) {}

  async getPrisonerRestrictions(
    prisonerNumber: string,
    page: number,
    size: number,
    user: HmppsUser,
    currentTerm: boolean,
    paged: boolean,
  ): Promise<PagedModelPrisonerRestrictionDetails> {
    return this.personalRelationshipsApiClient.getPrisonerRestrictions(
      prisonerNumber,
      page,
      size,
      user,
      currentTerm,
      paged,
    )
  }
}
