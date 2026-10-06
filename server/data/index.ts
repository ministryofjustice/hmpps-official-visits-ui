import { AuthenticationClient, InMemoryTokenStore, RedisTokenStore } from '@ministryofjustice/hmpps-auth-clients'
import applicationInfoSupplier from '../applicationInfo'
import { createRedisClient } from './redisClient'
import config from '../config'
import HmppsAuditClient from './hmppsAuditClient'
import logger from '../../logger'
import PrisonerSearchApiClient from './prisonerSearchApiClient'
import OfficialVisitsApiClient from './officialVisitsApiClient'
import PrisonApiClient from './prisonApiClient'
import PersonalRelationshipsApiClient from './personalRelationshipsApiClient'
import ActivitiesApiClient from './activitiesApiClient'
import ManageUsersApiClient from './manageUsersApiClient'
import BookAVideoLinkApiClient from './bookAVideoLinkApiClient'

const applicationInfo = applicationInfoSupplier()

export const dataAccess = () => {
  const hmppsAuthClient = new AuthenticationClient(
    config.apis.hmppsAuth,
    logger,
    config.redis.enabled ? new RedisTokenStore(createRedisClient()) : new InMemoryTokenStore(),
  )

  return {
    applicationInfo,
    prisonerSearchApi: new PrisonerSearchApiClient(hmppsAuthClient),
    officialVisitsApi: new OfficialVisitsApiClient(hmppsAuthClient),
    hmppsAuditClient: new HmppsAuditClient(config.sqs.audit),
    prisonApiClient: new PrisonApiClient(hmppsAuthClient),
    personalRelationshipsApiClient: new PersonalRelationshipsApiClient(hmppsAuthClient),
    activitiesApiClient: new ActivitiesApiClient(hmppsAuthClient),
    manageUsersApiClient: new ManageUsersApiClient(hmppsAuthClient),
    bookAVideoLinkApiClient: new BookAVideoLinkApiClient(hmppsAuthClient),
  }
}

export type DataAccess = ReturnType<typeof dataAccess>

export {
  HmppsAuditClient,
  PrisonerSearchApiClient,
  OfficialVisitsApiClient,
  PrisonApiClient,
  PersonalRelationshipsApiClient,
  ActivitiesApiClient,
  BookAVideoLinkApiClient,
}
