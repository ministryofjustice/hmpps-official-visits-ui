import { Response } from 'express'
import OfficialVisitsApiClient from '../data/officialVisitsApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import { OfficialVisit, AvailableTimeSlots } from '../@types/officialVisitsApi/types'
import { OfficialVisitJourney } from '../routes/journeys/manage/visit/journey'
import logger from '../../logger'
import { components } from '../@types/officialVisitsApi'

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

  public async createVisit(visit: components['schemas']['CreateOfficialVisitRequest'], user: HmppsUser) {
    logger.info(`Just using vars ${JSON.stringify(visit)}, ${JSON.stringify(user)}`)
    // TODO: Bypass create code while for demo
    return '1'
    // return await this.officialVisitsApiClient.createOfficialVisit(visit, user)
  }

  public async amendVisit(visit: OfficialVisitJourney, user: HmppsUser) {
    logger.info(`Just using vars ${JSON.stringify(visit)}, ${JSON.stringify(user)}`)
    // TODO: Map the journey to a VisitAmendRequest, call the service amend, and return the amended visit
  }

  public async getAvailableTimeSlots(username: string, prisonId: string, date: string): Promise<AvailableTimeSlots[]> {
    logger.info(`Just using vars ${JSON.stringify(username)}, ${JSON.stringify(prisonId)}, ${JSON.stringify(date)}`)

    const availableTimeSlots: AvailableTimeSlots[] = [
      {
        dayCode: 'One',
        startTime: '11:30',
        endTime: '12:30',
        dpsLocationId: 'DPS',
        maxAdults: '2',
        maxGroups: '1',
      },
    ]
    return availableTimeSlots
  }

  public async getReferenceData(res: Response, code: components['schemas']['ReferenceDataGroup']) {
    return this.officialVisitsApiClient.getReferenceData(code, res.locals.user)
  }

  public async getActiveRestrictions(res: Response, prisonId: string, prisonerNumber: string) {
    return this.officialVisitsApiClient.getActiveRestrictions(prisonId, prisonerNumber, res.locals.user)
  }

  public async getApprovedOfficialContacts(prisonId: string, prisonerNumber: string, user: HmppsUser) {
    return this.officialVisitsApiClient.getApprovedOfficialContacts(prisonId, prisonerNumber, user)
  }

  public async getApprovedSocialContacts(prisonId: string, prisonerNumber: string, user: HmppsUser) {
    return this.officialVisitsApiClient.getApprovedSocialContacts(prisonId, prisonerNumber, user)
  }

  public async getAvailableSlots(res: Response, prisonId: string, startDate: string, endDate: string) {
    return this.officialVisitsApiClient.getAvailableTimeSlots(prisonId, startDate, endDate, res.locals.user)
  }

  public async getSchedule(res: Response, prisonId: string, date: string) {
    return this.officialVisitsApiClient.getSchedule(prisonId, date, res.locals.user)
  }
}
