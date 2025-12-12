/* eslint-disable import/first */
/*
 * Do appinsights first as it does some magic instrumentation work, i.e. it affects other 'require's
 * In particular, applicationinsights automatically collects bunyan logs
 */
import { AuthenticationClient, InMemoryTokenStore, RedisTokenStore } from '@ministryofjustice/hmpps-auth-clients'
import { initialiseAppInsights, buildAppInsightsClient } from '../utils/azureAppInsights'
import applicationInfoSupplier from '../applicationInfo'

const applicationInfo = applicationInfoSupplier()
initialiseAppInsights()
buildAppInsightsClient(applicationInfo)

import { createRedisClient } from './redisClient'
import config from '../config'
import HmppsAuditClient from './hmppsAuditClient'
import logger from '../../logger'
import LocationsInPrisonApiClient from './locationsInPrisonApiClient'
import PrisonerSearchApiClient from './prisonerSearchApiClient'
import OfficialVisitsApiClient from './officialVisitsApiClient'
import PrisonApiClient from './prisonApiClient'
import PersonalRelationshipsApiClient from './personalRelationshipsApiClient'
import ActivitiesApiClient from './activitiesApiClient'

export const dataAccess = () => {
  const hmppsAuthClient = new AuthenticationClient(
    config.apis.hmppsAuth,
    logger,
    config.redis.enabled ? new RedisTokenStore(createRedisClient()) : new InMemoryTokenStore(),
  )

  return {
    applicationInfo,
    locationsInPrisonApi: new LocationsInPrisonApiClient(hmppsAuthClient),
    prisonerSearchApi: new PrisonerSearchApiClient(hmppsAuthClient),
    officialVisitsApi: new OfficialVisitsApiClient(hmppsAuthClient),
    hmppsAuditClient: new HmppsAuditClient(config.sqs.audit),
    prisonApiClient: new PrisonApiClient(hmppsAuthClient),
    personalRelationshipsApiClient: new PersonalRelationshipsApiClient(hmppsAuthClient),
    activitiesApiClient: new ActivitiesApiClient(hmppsAuthClient),
  }
}

export type DataAccess = ReturnType<typeof dataAccess>

export {
  HmppsAuditClient,
  LocationsInPrisonApiClient,
  PrisonerSearchApiClient,
  OfficialVisitsApiClient,
  PrisonApiClient,
  PersonalRelationshipsApiClient,
  ActivitiesApiClient,
}
