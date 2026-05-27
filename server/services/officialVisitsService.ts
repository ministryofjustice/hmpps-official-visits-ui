import { Response } from 'express'
import { endOfDay, startOfDay } from 'date-fns'
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
  NotificationRequest,
} from '../@types/officialVisitsApi/types'
import { OfficialVisitJourney } from '../routes/journeys/manage/visit/journey'
import logger from '../../logger'
import { components } from '../@types/officialVisitsApi'

export type SentEmailNotificationType = 'CREATE' | 'AMEND' | 'CANCEL'

export type SentEmailSearchCriteria = {
  page: number
  size: number
  fromDate?: Date
  toDate?: Date
}

export type SentEmailRecord = {
  officialVisitId: number
  sentDate: string
  sentDateTime: string
  visitDate: string
  visitStartTime: string
  visitEndTime: string
  prisonerName: string
  prisonerNumber: string
  emailAddress: string
  emailStatus: 'SENT' | 'FAILED'
  notificationType: SentEmailNotificationType
  notificationTypeDescription: string
}

export type SentEmailSearchResults = {
  content: SentEmailRecord[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

const SENT_EMAILS: SentEmailRecord[] = [
  {
    officialVisitId: 4006,
    sentDate: '2026-05-20',
    sentDateTime: '2026-05-20T12:23:00',
    visitDate: '2026-05-21',
    visitStartTime: '13:30',
    visitEndTime: '16:00',
    prisonerName: 'Tim Harrison',
    prisonerNumber: 'G4793VF',
    emailAddress: 'prabash.balasuriya@justice.gov.uk',
    emailStatus: 'SENT',
    notificationType: 'CREATE',
    notificationTypeDescription: 'Create',
  },
  {
    officialVisitId: 4005,
    sentDate: '2026-05-19',
    sentDateTime: '2026-05-19T11:40:00',
    visitDate: '2026-05-20',
    visitStartTime: '13:30',
    visitEndTime: '16:00',
    prisonerName: 'Jane Doe',
    prisonerNumber: 'A1234AA',
    emailAddress: 'jane.doe@example.com',
    emailStatus: 'FAILED',
    notificationType: 'AMEND',
    notificationTypeDescription: 'Amend',
  },
  {
    officialVisitId: 4004,
    sentDate: '2026-05-18',
    sentDateTime: '2026-05-18T10:35:00',
    visitDate: '2026-05-19',
    visitStartTime: '13:30',
    visitEndTime: '16:00',
    prisonerName: 'Peter Malicious',
    prisonerNumber: 'B2345BB',
    emailAddress: 'peter.malicious@example.com',
    emailStatus: 'SENT',
    notificationType: 'CANCEL',
    notificationTypeDescription: 'Cancel',
  },
  {
    officialVisitId: 4003,
    sentDate: '2026-05-17',
    sentDateTime: '2026-05-17T09:22:00',
    visitDate: '2026-05-18',
    visitStartTime: '13:30',
    visitEndTime: '16:00',
    prisonerName: 'Sally Smith',
    prisonerNumber: 'C3456CC',
    emailAddress: 'sally.smith@example.com',
    emailStatus: 'SENT',
    notificationType: 'CREATE',
    notificationTypeDescription: 'Create',
  },
  {
    officialVisitId: 4002,
    sentDate: '2026-05-16',
    sentDateTime: '2026-05-16T08:17:00',
    visitDate: '2026-05-17',
    visitStartTime: '13:30',
    visitEndTime: '16:00',
    prisonerName: 'Rob Jones',
    prisonerNumber: 'D4567DD',
    emailAddress: 'rob.jones@example.com',
    emailStatus: 'FAILED',
    notificationType: 'AMEND',
    notificationTypeDescription: 'Amend',
  },
  {
    officialVisitId: 4001,
    sentDate: '2026-05-15',
    sentDateTime: '2026-05-15T07:50:00',
    visitDate: '2026-05-16',
    visitStartTime: '13:30',
    visitEndTime: '16:00',
    prisonerName: 'Anne Brown',
    prisonerNumber: 'E5678EE',
    emailAddress: 'anne.brown@example.com',
    emailStatus: 'SENT',
    notificationType: 'CANCEL',
    notificationTypeDescription: 'Cancel',
  },
]

export default class OfficialVisitsService {
  constructor(private readonly officialVisitsApiClient: OfficialVisitsApiClient) {}

  public async getOfficialVisitById(visitId: number, user: HmppsUser): Promise<OfficialVisit> {
    return this.officialVisitsApiClient.getOfficialVisitById(visitId, user)
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
    existingVisitId?: number,
  ) {
    return this.officialVisitsApiClient.getAvailableTimeSlots(
      prisonId,
      startDate,
      endDate,
      videoOnly,
      existingVisitId || 0,
      res.locals.user,
    )
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

  public async sendNotification(visitId: string, body: NotificationRequest, user: HmppsUser) {
    logger.info(`Send notification for visit id ${visitId} and notification type ${body.notificationType}`)
    return this.officialVisitsApiClient.sendNotification(Number(visitId), body, user)
  }

  public async getSentEmails(criteria: SentEmailSearchCriteria, user: HmppsUser): Promise<SentEmailSearchResults> {
    logger.info(`Get sent emails called by ${user.userId} with criteria ${JSON.stringify(criteria)}`)

    const pageSize = Math.max(criteria.size, 1)
    const requestedPage = Math.max(criteria.page, 1)
    const filtered = SENT_EMAILS.filter(email => {
      const sentAt = new Date(`${email.sentDate}T00:00:00Z`)
      const afterFromDate = !criteria.fromDate || sentAt >= startOfDay(criteria.fromDate)
      const beforeToDate = !criteria.toDate || sentAt <= endOfDay(criteria.toDate)
      return afterFromDate && beforeToDate
    }).sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime())

    const totalElements = filtered.length
    const totalPages = totalElements ? Math.ceil(totalElements / pageSize) : 0
    const pageIndex = totalPages ? Math.min(requestedPage - 1, totalPages - 1) : 0

    return {
      content: filtered.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
      totalElements,
      totalPages,
      number: pageIndex,
      size: pageSize,
      first: pageIndex === 0,
      last: totalPages <= 1 || pageIndex >= totalPages - 1,
    }
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
