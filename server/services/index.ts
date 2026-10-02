import { dataAccess } from '../data'
import AuditService from './auditService'
import PrisonerService from './prisonerService'
import OfficialVisitsService from './officialVisitsService'
import PrisonerImageService from './prisonerImageService'
import PersonalRelationshipsService from './personalRelationshipsService'
import ActivitiesService from './activitiesService'
import ManageUserService from './manageUsersService'
import TelemetryService from './telemetryService'
import BookAVideoLinkService from './bookAVideoLinkService'

export const services = () => {
  const {
    applicationInfo,
    hmppsAuditClient,
    prisonerSearchApi,
    officialVisitsApi,
    prisonApiClient,
    personalRelationshipsApiClient,
    activitiesApiClient,
    manageUsersApiClient,
    applicationInsightsClient,
    bookAVideoLinkApiClient,
  } = dataAccess()

  return {
    applicationInfo,
    auditService: new AuditService(hmppsAuditClient),
    telemetryService: new TelemetryService(applicationInsightsClient),
    prisonerService: new PrisonerService(prisonerSearchApi),
    officialVisitsService: new OfficialVisitsService(officialVisitsApi),
    prisonerImageService: new PrisonerImageService(prisonApiClient),
    personalRelationshipsService: new PersonalRelationshipsService(personalRelationshipsApiClient),
    activitiesService: new ActivitiesService(activitiesApiClient),
    manageUsersService: new ManageUserService(manageUsersApiClient),
    bookAVideoLinkService: new BookAVideoLinkService(bookAVideoLinkApiClient),
  }
}

export type Services = ReturnType<typeof services>
