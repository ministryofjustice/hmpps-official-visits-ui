import { dataAccess } from '../data'
import AuditService from './auditService'
import LocationsService from './locationsService'
import PrisonerService from './prisonerService'
import OfficialVisitsService from './officialVisitsService'
import PrisonerImageService from './prisonerImageService'
import PersonalRelationshipsService from './personalRelationshipsService'
import ActivitiesService from './activitiesService'

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
  } = dataAccess()

  return {
    applicationInfo,
    auditService: new AuditService(hmppsAuditClient),
    locationsService: new LocationsService(locationsInPrisonApi),
    prisonerService: new PrisonerService(prisonerSearchApi),
    officialVisitsService: new OfficialVisitsService(officialVisitsApi),
    prisonerImageService: new PrisonerImageService(prisonApiClient),
    personalRelationshipsService: new PersonalRelationshipsService(personalRelationshipsApiClient),
    activitiesService: new ActivitiesService(activitiesApiClient),
  }
}

export type Services = ReturnType<typeof services>
