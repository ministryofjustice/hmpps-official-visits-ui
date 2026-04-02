import { Response } from 'express'
import OfficialVisitsApiClient from '../data/officialVisitsApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import {
  CancelTypeRequest,
  CompleteVisitRequest,
  CreateOfficialVisitRequest,
  CreateOfficialVisitResponse,
  CreateTimeSlotRequest,
  FindByCriteria,
  OfficialVisit,
  OfficialVisitUpdateCommentRequest,
  OfficialVisitUpdateSlotRequest,
  OfficialVisitUpdateVisitorsRequest,
  OfficialVisitor,
  SearchLevelType,
  UpdateTimeSlotRequest,
  VisitorEquipment,
  VisitorType,
  CreateVisitSlotRequest,
  OverlappingVisitsResponse,
} from '../@types/officialVisitsApi/types'
import { OfficialVisitJourney } from '../routes/journeys/manage/visit/journey'
import logger from '../../logger'
import { components } from '../@types/officialVisitsApi'

export default class OfficialVisitsService {
  constructor(private readonly officialVisitsApiClient: OfficialVisitsApiClient) { }

  public async getOfficialVisitById(prisonCode: string, visitId: number, user: HmppsUser): Promise<OfficialVisit> {
    return this.officialVisitsApiClient.getOfficialVisitById(prisonCode, visitId, user)
  }

  public async createVisit(sessionVisit: OfficialVisitJourney, user: HmppsUser): Promise<CreateOfficialVisitResponse> {
    // Populate the create visit request from the session object
    const request = {
      prisonVisitSlotId: sessionVisit.selectedTimeSlot.visitSlotId,
      prisonCode: sessionVisit.prisonCode,
      prisonerNumber: sessionVisit.prisoner.prisonerNumber,
      visitDate: sessionVisit.selectedTimeSlot.visitDate,
      startTime: sessionVisit.selectedTimeSlot.startTime,
      endTime: sessionVisit.selectedTimeSlot.endTime,
      dpsLocationId: sessionVisit.selectedTimeSlot.dpsLocationId,
      visitTypeCode: sessionVisit.visitType,
      staffNotes: sessionVisit.staffNotes, // Not supplied by UI journey yet
      prisonerNotes: sessionVisit.prisonerNotes,
      searchTypeCode: 'FULL' as SearchLevelType, // Not supplied by UI journey yet
      officialVisitors: [...(sessionVisit.officialVisitors || []), ...(sessionVisit.socialVisitors || [])].map(o => ({
        visitorTypeCode: 'CONTACT' as VisitorType,
        contactId: o.contactId,
        prisonerContactId: o.prisonerContactId,
        relationshipCode: o.relationshipToPrisonerCode,
        leadVisitor: o.leadVisitor,
        assistedVisit: o.assistedVisit,
        assistedNotes: o.assistanceNotes,
        visitorEquipment: {
          description: o.equipmentNotes,
        } as VisitorEquipment,
      })) as OfficialVisitor[],
    } as CreateOfficialVisitRequest

    logger.info(`Create visit request ${JSON.stringify(request, null, 2)}`)

    return this.officialVisitsApiClient.createOfficialVisit(sessionVisit.prisonCode, request, user)
  }

  public async getReferenceData(res: Response, code: components['schemas']['ReferenceDataGroup']) {
    return this.officialVisitsApiClient.getReferenceData(code, res.locals.user)
  }

  public async getAllOfficialContacts(
    prisonerNumber: string,
    user: HmppsUser,
    approved?: boolean,
    currentTerm?: boolean,
  ) {
    const allContacts = await this.getAllContacts(prisonerNumber, user, approved, currentTerm)
    return allContacts.filter(contact => contact.relationshipTypeCode === 'O')
  }

  public async getAllSocialContacts(
    prisonerNumber: string,
    user: HmppsUser,
    approved?: boolean,
    currentTerm?: boolean,
  ) {
    const allContacts = await this.getAllContacts(prisonerNumber, user, approved, currentTerm)
    return allContacts.filter(contact => contact.relationshipTypeCode === 'S')
  }

  public async getAllContacts(prisonerNumber: string, user: HmppsUser, approved?: boolean, currentTerm?: boolean) {
    logger.info(
      `Get all contacts for prisoner ${prisonerNumber} with filters: approved=${approved}, currentTerm=${currentTerm}`,
    )
    return this.officialVisitsApiClient.getAllContacts(prisonerNumber, user, approved, currentTerm)
  }

  public async getAvailableSlots(
    res: Response,
    prisonId: string,
    startDate: string,
    endDate: string,
    videoOnly: boolean,
    existingVisitId?: number
  ) {
    return this.officialVisitsApiClient.getAvailableTimeSlots(prisonId, startDate, endDate, videoOnly, existingVisitId, res.locals.user)
  }

  public async getSchedule(res: Response, prisonId: string, date: string) {
    return this.officialVisitsApiClient.getSchedule(prisonId, date, res.locals.user)
  }

  public async getVisits(prisonId: string, criteria: FindByCriteria, page: number, size: number, user: HmppsUser) {
    logger.info(`Get visits for prison ${prisonId} with criteria ${JSON.stringify(criteria)}`)
    return this.officialVisitsApiClient.getVisits(prisonId, criteria, page, size, user)
  }

  public async completeVisit(prisonId: string, visitId: string, body: CompleteVisitRequest, user: HmppsUser) {
    logger.info(`Complete visit for prison ${prisonId} with visit id ${visitId} and body ${JSON.stringify(body)}`)
    return this.officialVisitsApiClient.completeVisit(prisonId, visitId, body, user)
  }

  public async cancelVisit(prisonId: string, visitId: string, body: CancelTypeRequest, user: HmppsUser) {
    logger.info(`Cancel visit for prison ${prisonId} with visit id ${visitId} and body ${JSON.stringify(body)}`)
    return this.officialVisitsApiClient.cancelVisit(prisonId, visitId, body, user)
  }

  public async getVisitSlotsAtPrison(prisonId: string, user: HmppsUser) {
    logger.info(`Get visits slots called by ${user.userId} ${user.displayName}`)
    return this.officialVisitsApiClient.getAllTimeSlotsAndVisitSlots(prisonId, user)
  }

  public async getPrisonTimeSlotSummaryById(prisonTimeSlotId: number, user: HmppsUser) {
    logger.info(`Get time slot by id called by ${user.userId} ${user.displayName}`)
    return this.officialVisitsApiClient.getPrisonTimeSlotSummaryById(prisonTimeSlotId, user)
  }

  public async createTimeSlot(body: CreateTimeSlotRequest, user: HmppsUser) {
    logger.info(`create a time slot called by ${user.userId} ${user.displayName}`)
    return this.officialVisitsApiClient.createTimeSlot(body, user)
  }

  public async createVisitSlot(prisonTimeSlotId: number, body: CreateVisitSlotRequest, user: HmppsUser) {
    logger.info(`create a visit slot called by ${user.userId} ${user.displayName}`)
    return this.officialVisitsApiClient.createVisitSlot(prisonTimeSlotId, body, user)
  }

  public async updateVisitors(
    prisonId: string,
    visitId: string,
    body: OfficialVisitUpdateVisitorsRequest,
    user: HmppsUser,
  ) {
    logger.info(`Update visitors for prison ${prisonId} with visit id ${visitId} and body ${JSON.stringify(body)}`)
    return this.officialVisitsApiClient.updateVisitors(prisonId, visitId, body, user)
  }

  public async updateVisitTypeAndSlot(
    prisonId: string,
    visitId: string,
    body: OfficialVisitUpdateSlotRequest,
    user: HmppsUser,
  ) {
    logger.info(
      `Update visit type and slot for prison ${prisonId} with visit id ${visitId} and body ${JSON.stringify(body)}`,
    )
    return this.officialVisitsApiClient.updateVisitTypeAndSlot(prisonId, visitId, body, user)
  }

  public async updateComments(
    prisonId: string,
    visitId: string,
    body: OfficialVisitUpdateCommentRequest,
    user: HmppsUser,
  ) {
    logger.info(`Update comments for prison ${prisonId} with visit id ${visitId} and body ${JSON.stringify(body)}`)
    return this.officialVisitsApiClient.updateComments(prisonId, visitId, body, user)
  }

  public async getPrisonTimeSlotById(prisonTimeSlotId: number, user: HmppsUser) {
    logger.info(`Get prison time slot ${prisonTimeSlotId} called by ${user.userId}`)
    return this.officialVisitsApiClient.getPrisonTimeSlotById(prisonTimeSlotId, user)
  }

  public async updateTimeSlot(prisonTimeSlotId: number, body: UpdateTimeSlotRequest, user: HmppsUser) {
    logger.info(`Update time slot ${prisonTimeSlotId} called by ${user.userId}`)
    return this.officialVisitsApiClient.updateTimeSlot(prisonTimeSlotId, body, user)
  }

  public async getOfficialVisitLocationsAtPrison(prisonId: string, user: HmppsUser) {
    logger.info(`get official visit locations for prison ${prisonId} called by ${user.userId}`)
    return this.officialVisitsApiClient.getOfficialVisitLocationsAtPrison(prisonId, user)
  }

  public async getVisitSlot(visitSlotId: number, user: HmppsUser) {
    logger.info(`get visit slot by ${visitSlotId} called by ${user.userId}`)
    return this.officialVisitsApiClient.getVisitSlot(visitSlotId, user)
  }

  public async updateVisitSlot(
    visitSlotId: number,
    body: components['schemas']['UpdateVisitSlotRequest'],
    user: HmppsUser,
  ) {
    logger.info(`Update visit slot ${visitSlotId} called by ${user.userId}`)
    return this.officialVisitsApiClient.updateVisitSlot(visitSlotId, body, user)
  }

  public async deleteVisitSlot(visitSlotId: number, user: HmppsUser) {
    logger.info(`Delete visit slot ${visitSlotId} called by ${user.userId}`)
    return this.officialVisitsApiClient.deleteVisitSlot(visitSlotId, user)
  }

  public async deleteTimeSlot(timeSlotId: number, user: HmppsUser) {
    logger.info(`Delete time slot ${timeSlotId} called by ${user.userId}`)
    return this.officialVisitsApiClient.deleteTimeSlot(timeSlotId, user)
  }

  public async checkForOverlappingVisits(
    prisonCode: string,
    prisonerNumber: string,
    visitDate: string,
    startTime: string,
    endTime: string,
    contactIds?: number[],
    existingOfficialVisitId?: number,
    user?: HmppsUser,
  ): Promise<OverlappingVisitsResponse> {
    logger.info(
      `Check for overlapping visits for prisoner ${prisonerNumber} at ${visitDate} ${startTime}-${endTime} called by ${user?.userId}`,
    )
    return this.officialVisitsApiClient.checkForOverlappingVisits(
      prisonCode,
      prisonerNumber,
      visitDate,
      startTime,
      endTime,
      contactIds,
      existingOfficialVisitId,
      user,
    )
  }
}
