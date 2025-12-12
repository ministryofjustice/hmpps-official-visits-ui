import { Response } from 'express'
import OfficialVisitsApiClient from '../data/officialVisitsApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import {
  CreateOfficialVisitRequest,
  OfficialVisit,
  OfficialVisitor,
  SearchLevelType,
  VisitorEquipment,
  VisitorType
} from '../@types/officialVisitsApi/types'
import { OfficialVisitJourney } from '../routes/journeys/manage/visit/journey'
import logger from '../../logger'
import { components } from '../@types/officialVisitsApi'

export default class OfficialVisitsService {
  constructor(private readonly officialVisitsApiClient: OfficialVisitsApiClient) {}

  public async getOfficialVisitById(prisonCode: string, visitId: number, user: HmppsUser): Promise<OfficialVisit> {
    return this.officialVisitsApiClient.getOfficialVisitById(prisonCode, visitId, user)
  }

  public visitIsAmendable(date: Date, startTime: Date, visitStatusCode: string) {
    // TODO: Populate the rules here
    logger.info(`Just using vars ${date}, ${startTime}, ${visitStatusCode}`)
    return true
  }

  public async createVisit(sessionVisit: OfficialVisitJourney, user: HmppsUser) {
    // Populate request from session object
    const request = {
      prisonVisitSlotId: sessionVisit.selectedTimeSlot.visitSlotId,
      prisonCode: sessionVisit.prisonCode,
      prisonerNumber: sessionVisit.prisoner.prisonerNumber,
      visitDate: sessionVisit.selectedTimeSlot.visitDate,
      startTime: sessionVisit.selectedTimeSlot.startTime,
      endTime: sessionVisit.selectedTimeSlot.endTime,
      dpsLocationId: sessionVisit.selectedTimeSlot.dpsLocationId,
      visitTypeCode: sessionVisit.visitType,
      staffNotes: sessionVisit.staffNotes,  // Will be supplied from another comments box
      prisonerNotes: sessionVisit.prisonerNotes,
      searchTypeCode: 'FULL' as SearchLevelType,
      officialVisitors: [...sessionVisit.officialVisitors, ...sessionVisit.socialVisitors].map(o => ({
        visitorTypeCode: 'CONTACT' as VisitorType,
        contactId: o.contactId,
        prisonerContactId: o.prisonerContactId,
        relationshipCode: o.relationshipToPrisonerCode,
        leadVisitor: o.leadVisitor,
        assistedVisit: o.assistedVisit,
        assistedNotes: o.assistanceNotes,
        visitorEquipment: {
          description: o.assistanceNotes,
        } as VisitorEquipment,
      })) as OfficialVisitor[],
    } as CreateOfficialVisitRequest

    return await this.officialVisitsApiClient.createOfficialVisit(request, user)
  }

  public async amendVisit(sessionVisit: OfficialVisitJourney, user: HmppsUser) {
    logger.info(`Just using vars ${JSON.stringify(sessionVisit)}, ${JSON.stringify(user)}`)
    // TODO: Map the journey to a VisitAmendRequest, call the service amend, and return the amended visit
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
