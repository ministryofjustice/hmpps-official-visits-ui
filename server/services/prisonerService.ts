import PrisonerSearchApiClient from '../data/prisonerSearchApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { PagePrisoner, Prisoner, PaginationRequest, AttributeSearchRequest } from '../@types/prisonerSearchApi/types'
import { PrisonerSearchJourney } from '../routes/journeys/manage/prisoner-search/journey'
import logger from '../../logger'

const GHOST_PRISON = 'ZZGHI'

export default class PrisonerService {
  constructor(private readonly prisonerSearchApiClient: PrisonerSearchApiClient) {}

  public async getAllPrisons(user: HmppsUser): Promise<{ prisonCode: string; prisonDescription: string }[]> {
    // TODO: Implement this via prison API client with correct response type populated
    logger.info(`Just using vars ${JSON.stringify(user)}`)
    return [{ prisonCode: 'MDI', prisonDescription: 'Moorland (HMP)' }]
  }

  // TODO: Add tests for this
  public async getPrisonerByPrisonerNumber(prisonerNumber: string, user: HmppsUser): Promise<Prisoner> {
    logger.info(`Just using vars ${prisonerNumber} ${JSON.stringify(user)}`)
    return this.prisonerSearchApiClient.getPrisonerByPrisonerNumber(prisonerNumber, user)
  }

  // TODO: Add tests for this
  public searchPrisonersByCriteria(
    criteria: PrisonerSearchJourney,
    pagination: PaginationRequest,
    user: HmppsUser,
  ): Promise<PagePrisoner> {
    const createStringMatcher = (attribute: string, condition: string, searchTerm: string) =>
      searchTerm ? { type: 'String', attribute, condition, searchTerm } : undefined

    const createDateMatcher = (attribute: string, searchTerm: string) =>
      searchTerm ? { type: 'Date', attribute, minValue: searchTerm, maxValue: searchTerm } : undefined

    const createPncMatcher = (pncNumber: string) => (criteria.pncNumber ? { type: 'PNC', pncNumber } : undefined)

    /**
     * Example search:
     * (status = ACTIVE IN OR status = ACTIVE OUT) AND
     * (firstName CONTAINS :firstName AND lastName CONTAINS :lastName AND prisonerNumber = :prisonerNumber AND pncNumber = :pncNumber)
     */

    const searchQuery = {
      joinType: 'AND',
      queries: [
        {
          joinType: 'OR',
          matchers: [
            createStringMatcher('status', 'IS', 'ACTIVE IN'),
            createStringMatcher('status', 'IS', 'ACTIVE OUT'),
          ],
        },
        {
          joinType: 'AND',
          matchers: [
            createStringMatcher('firstName', 'CONTAINS', criteria.firstName),
            createStringMatcher('lastName', 'CONTAINS', criteria.lastName),
            createDateMatcher('dateOfBirth', criteria.dateOfBirth),
            createStringMatcher('prisonId', 'IS', criteria.prisonCode),
            createStringMatcher('prisonId', 'IS_NOT', GHOST_PRISON),
            createStringMatcher('prisonerNumber', 'IS', criteria.prisonerNumber),
            createPncMatcher(criteria.pncNumber),
          ].filter(Boolean),
        },
      ],
    }

    return this.prisonerSearchApiClient.getByAttributes(searchQuery as AttributeSearchRequest, user, pagination, {
      attribute: 'firstName',
      order: 'ASC',
    })
  }
}
