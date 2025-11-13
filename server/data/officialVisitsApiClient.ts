import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import { OfficialVisit } from '../@types/officialVisitsApi/types'
import { components } from '../@types/officialVisitsApi'

export default class OfficialVisitsApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Official Visits API Client', config.apis.officialVisitsApi, logger, authenticationClient)
  }

  // Not a real endpoint at present - none exist - just for test support
  getOfficialVisitById(officialVisitId: number, user: HmppsUser): Promise<OfficialVisit> {
    return this.get<OfficialVisit>({ path: `/official-visits/${officialVisitId}` }, asSystem(user.username))
  }

  getReferenceData(code: components['schemas']['ReferenceDataGroup'], user: HmppsUser) {
    return this.get<components['schemas']['ReferenceDataItem'][]>(
      { path: `/reference-data/group/${code}` },
      asSystem(user.username),
    )
  }
}
