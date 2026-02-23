import { dataAccess } from '../data'
import AuditService from './auditService'
import LocationsService from './locationsService'
import PrisonerService from './prisonerService'
import OfficialVisitsService from './officialVisitsService'
import PrisonerImageService from './prisonerImageService'
import PersonalRelationshipsService from './personalRelationshipsService'
import ActivitiesService from './activitiesService'
import ManageUserService from './manageUsersService'
import TelemetryService from './telemetryService'

export const services = () => {
  const {
    applicationInfo,
    hmppsAuditClient,
    locationsInPrisonApi,
    prisonerSearchApi,
    officialVisitsApi,
    prisonApiClient,
    personalRelationshipsApiClient,
    activitiesApiClient,
    manageUsersApiClient,
    applicationInsightsClient,
  } = dataAccess()

  return {
    applicationInfo,
    auditService: new AuditService(hmppsAuditClient),
    telemetryService: new TelemetryService(applicationInsightsClient),
    locationsService: new LocationsService(locationsInPrisonApi),
    prisonerService: new PrisonerService(prisonerSearchApi),
    officialVisitsService: new OfficialVisitsService(officialVisitsApi),
    prisonerImageService: new PrisonerImageService(prisonApiClient),
    personalRelationshipsService: new PersonalRelationshipsService(personalRelationshipsApiClient),
    activitiesService: new ActivitiesService(activitiesApiClient),
    manageUsersService: new ManageUserService(manageUsersApiClient),
  }
}

export type Services = ReturnType<typeof services>
