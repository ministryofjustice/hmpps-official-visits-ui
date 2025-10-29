import OfficialVisitsApiClient from '../data/officialVisitsApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { OfficialVisit } from '../@types/officialVisitsApi/types'
import { OfficialVisitJourney } from '../routes/journeys/manageVisits/visit/journey'
import logger from '../../logger'

export default class OfficialVisitsService {
  constructor(private readonly officialVisitsApiClient: OfficialVisitsApiClient) {}

  public async getOfficialVisitById(visitId: number, user: HmppsUser): Promise<OfficialVisit> {
    return this.officialVisitsApiClient.getOfficialVisitById(visitId, user)
  }

  public visitIsAmendable(date: Date, startTime: Date, visitStatusCode: string) {
    // TODO: Populate the rules here
    logger.info(`Just using vars ${date}, ${startTime}, ${visitStatusCode}`)
    return true
  }

  public async createVisit(visit: OfficialVisitJourney, user: HmppsUser) {
    logger.info(`Just using vars ${JSON.stringify(visit)}, ${JSON.stringify(user)}`)
    // TODO: Map the journey to a VisitCreateRequest, call service create, and return a visit
  }

  public async amendVisit(visit: OfficialVisitJourney, user: HmppsUser) {
    logger.info(`Just using vars ${JSON.stringify(visit)}, ${JSON.stringify(user)}`)
    // TODO: Map the journey to a VisitAmendRequest, call the service amend, and return the amended visit
  }
}
