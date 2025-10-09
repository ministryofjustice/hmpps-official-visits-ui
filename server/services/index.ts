import { dataAccess } from '../data'
import AuditService from './auditService'
import LocationsService from './locationsService'
import PrisonerService from './prisonerService'
import OfficialVisitsService from './officialVisitsService'

export const services = () => {
  const {
    applicationInfo,
    hmppsAuditClient,
    hmppsAuthClient,
    locationsInPrisonApi,
    prisonerSearchApi,
    officialVisitsApi,
  } = dataAccess()

  return {
    applicationInfo,
    hmppsAuthClient,
    auditService: new AuditService(hmppsAuditClient),
    locationsService: new LocationsService(locationsInPrisonApi),
    prisonerService: new PrisonerService(prisonerSearchApi),
    officialVisitsService: new OfficialVisitsService(officialVisitsApi),
  }
}

export type Services = ReturnType<typeof services>
