import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import {
  ApprovedContact,
  AvailableSlot,
  CancelTypeRequest,
  CompleteVisitRequest,
  CreateOfficialVisitRequest,
  CreateOfficialVisitResponse,
  CreateTimeSlotRequest,
  CreateVisitSlotRequest,
  FindByCriteria,
  FindByCriteriaResults,
  OfficialVisit,
  OfficialVisitUpdateCommentRequest,
  OfficialVisitUpdateSlotRequest,
  OfficialVisitUpdateVisitorsRequest,
  OverlappingVisitsResponse,
  ReferenceDataItem,
  TimeSlot,
  TimeSlotSummary,
  TimeSlotSummaryItem,
  UpdateTimeSlotRequest,
  UpdateVisitSlotRequest,
  VisitLocation,
  VisitSlot,
} from '../@types/officialVisitsApi/types'
import { components } from '../@types/officialVisitsApi'

export type RestrictionPlaceholder = {
  contactId: number
  typeCode: string
  typeDescription: string
  comments: string
  startDate: string
  endDate?: string
}

export type ScheduleItemPlaceholder = {
  id: number
  startTime: string
  endTime: string
  eventName: string
  // These feel like they're probably reference data akin but UI only really needs the descriptions since we're not POSTing this data
  typeCode: string
  typeDescription: string
  locationCode: string
  locationDescription: string
}

export default class OfficialVisitsApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Official Visits API Client', config.apis.officialVisitsApi, logger, authenticationClient)
  }

  async createOfficialVisit(prisonCode: string, request: CreateOfficialVisitRequest, user: HmppsUser) {
    return this.post<CreateOfficialVisitResponse>(
      { path: `/official-visit/prison/${prisonCode}`, data: request },
      asSystem(user.username),
    )
  }

  // Not a real endpoint at present - none exist - just for test support
  async getOfficialVisitById(prisonCode: string, officialVisitId: number, user: HmppsUser): Promise<OfficialVisit> {
    return this.get<OfficialVisit>(
      { path: `/official-visit/prison/${prisonCode}/id/${officialVisitId}` },
      asSystem(user.username),
    )
  }

  async getReferenceData(code: components['schemas']['ReferenceDataGroup'], user: HmppsUser) {
    return this.get<ReferenceDataItem[]>({ path: `/reference-data/group/${code}` }, asSystem(user.username))
  }

  async getSchedule(_prisonId: string, _date: string, _user: HmppsUser): Promise<ScheduleItemPlaceholder[]> {
    return Promise.resolve([
      {
        id: 1,
        startTime: '08:00',
        endTime: '17:00',
        eventName: 'ROTL - out of prison',
        typeCode: 'ACT',
        typeDescription: 'Activity',
        locationCode: 'OUT',
        locationDescription: 'Out of prison',
      },
      {
        id: 2,
        startTime: '08:00',
        endTime: '11:45',
        eventName: 'Workshop 1 - Carpentry & Joinery',
        typeCode: 'ACT',
        typeDescription: 'Activity',
        locationCode: 'WSH',
        locationDescription: 'Workshop 1',
      },
    ])
    // return this.get<ScheduleItemPlaceholder[]>({ path: `/schedule/${prisonId}?date=${date}` }, asSystem(user.username))
  }

  async getAvailableTimeSlots(
    prisonId: string,
    startDate: string,
    endDate: string,
    videoOnly: boolean,
    existingOfficialVisitId: number,
    user: HmppsUser,
  ): Promise<AvailableSlot[]> {
    return this.get<AvailableSlot[]>(
      {
        path: `/available-slots/${prisonId}?fromDate=${startDate}&toDate=${endDate}&videoOnly=${videoOnly}${existingOfficialVisitId ? `&existingOfficialVisitId=${existingOfficialVisitId}` : ''}`,
      },
      asSystem(user.username),
    )
  }

  async getActiveRestrictions(
    _prisonId: string,
    _prisonerNumber: string,
    _user: HmppsUser,
  ): Promise<RestrictionPlaceholder[]> {
    return Promise.resolve([
      {
        contactId: 3,
        typeCode: 'CLOSED',
        typeDescription: 'Closed',
        comments: 'Closed visits only',
        startDate: '2022-12-01',
        endDate: '2022-12-31',
      },
      {
        contactId: 2,
        typeCode: 'BAN',
        typeDescription: 'Banned',
        comments: 'Banned from all visits',
        startDate: '2023-12-01',
        endDate: '2023-12-31',
      },
      {
        contactId: 1,
        typeCode: 'RESTRICTED',
        typeDescription: 'Restricted',
        comments: 'Not to contact Sarah Philips until 03/08/2026.',
        startDate: '2017-10-17',
      },
    ])
    // return this.get<RestrictionPlaceholder[]>({ path: `/prison/${prisonId}/prisoner/${prisonerNumber}/restrictions` }, asSystem(user.username))
  }

  async getApprovedOfficialContacts(
    _prisonId: string,
    prisonerNumber: string,
    user: HmppsUser,
  ): Promise<ApprovedContact[]> {
    return this.get<ApprovedContact[]>(
      {
        path: `/prisoner/${prisonerNumber}/approved-relationships?relationshipType=O`,
      },
      asSystem(user.username),
    )
  }

  async getApprovedSocialContacts(
    _prisonId: string,
    prisonerNumber: string,
    user: HmppsUser,
  ): Promise<ApprovedContact[]> {
    return this.get<ApprovedContact[]>(
      {
        path: `/prisoner/${prisonerNumber}/approved-relationships?relationshipType=S`,
      },
      asSystem(user.username),
    )
  }

  async getAllContacts(
    prisonerNumber: string,
    user: HmppsUser,
    approved?: boolean,
    currentTerm?: boolean,
  ): Promise<components['schemas']['PrisonerContact'][]> {
    const queryParams = new URLSearchParams()
    if (approved !== undefined) {
      queryParams.append('approved', approved.toString())
    }
    if (currentTerm !== undefined) {
      queryParams.append('currentTerm', currentTerm.toString())
    }

    const queryString = queryParams.toString()
    const path = queryString
      ? `/prisoner/${prisonerNumber}/all-contacts?${queryString}`
      : `/prisoner/${prisonerNumber}/all-contacts`

    return this.get<components['schemas']['PrisonerContact'][]>({ path }, asSystem(user.username))
  }

  async getVisits(
    prisonId: string,
    criteria: FindByCriteria,
    page: number,
    size: number,
    user: HmppsUser,
  ): Promise<FindByCriteriaResults> {
    return this.post<FindByCriteriaResults>(
      { path: `/official-visit/prison/${prisonId}/find-by-criteria?page=${page}&size=${size}`, data: criteria },
      asSystem(user.username),
    )
  }

  async completeVisit(prisonCode: string, visitId: string, body: CompleteVisitRequest, user: HmppsUser) {
    return this.post<CompleteVisitRequest>(
      { path: `/official-visit/prison/${prisonCode}/id/${visitId}/complete`, data: body },
      asSystem(user.username),
    )
  }

  async cancelVisit(prisonCode: string, visitId: string, body: CancelTypeRequest, user: HmppsUser) {
    return this.post<CancelTypeRequest>(
      { path: `/official-visit/prison/${prisonCode}/id/${visitId}/cancel`, data: body },
      asSystem(user.username),
    )
  }

  async getPrisonTimeSlotSummaryById(prisonTimeSlotId: number, user: HmppsUser): Promise<TimeSlotSummaryItem> {
    return this.get<TimeSlotSummaryItem>(
      { path: `/admin/time-slot/${prisonTimeSlotId}/summary` },
      asSystem(user.username),
    )
  }

  async getAllTimeSlotsAndVisitSlots(prisonCode: string, user: HmppsUser): Promise<TimeSlotSummary> {
    return this.get<TimeSlotSummary>(
      { path: `/admin/time-slots/prison/${prisonCode}?activeOnly=false` },
      asSystem(user.username),
    )
  }

  async createTimeSlot(body: CreateTimeSlotRequest, user: HmppsUser): Promise<TimeSlot> {
    return this.post<TimeSlot>({ path: `/admin/time-slot`, data: body }, asSystem(user.username))
  }

  async createVisitSlot(prisonTimeSlotId: number, body: CreateVisitSlotRequest, user: HmppsUser): Promise<TimeSlot> {
    return this.post<TimeSlot>(
      { path: `/admin/time-slot/${prisonTimeSlotId}/visit-slot`, data: body },
      asSystem(user.username),
    )
  }

  async updateVisitSlot(visitSlotId: number, body: UpdateVisitSlotRequest, user: HmppsUser) {
    return this.put<TimeSlot>({ path: `/admin/visit-slot/id/${visitSlotId}`, data: body }, asSystem(user.username))
  }

  async updateVisitors(prisonCode: string, visitId: string, body: OfficialVisitUpdateVisitorsRequest, user: HmppsUser) {
    return this.put(
      { path: `/official-visit/prison/${prisonCode}/id/${visitId}/visitors`, data: body },
      asSystem(user.username),
    )
  }

  async updateVisitTypeAndSlot(
    prisonCode: string,
    visitId: string,
    body: OfficialVisitUpdateSlotRequest,
    user: HmppsUser,
  ) {
    return this.put(
      { path: `/official-visit/prison/${prisonCode}/id/${visitId}/update-type-and-slot`, data: body },
      asSystem(user.username),
    )
  }

  async updateComments(prisonCode: string, visitId: string, body: OfficialVisitUpdateCommentRequest, user: HmppsUser) {
    return this.put(
      { path: `/official-visit/prison/${prisonCode}/id/${visitId}/update-comments`, data: body },
      asSystem(user.username),
    )
  }

  async getPrisonTimeSlotById(prisonTimeSlotId: number, user: HmppsUser): Promise<TimeSlot> {
    return this.get<TimeSlot>({ path: `/admin/time-slot/${prisonTimeSlotId}` }, asSystem(user.username))
  }

  async updateTimeSlot(prisonTimeSlotId: number, body: UpdateTimeSlotRequest, user: HmppsUser): Promise<TimeSlot> {
    return this.put<TimeSlot>({ path: `/admin/time-slot/${prisonTimeSlotId}`, data: body }, asSystem(user.username))
  }

  async getOfficialVisitLocationsAtPrison(prisonCode: string, user: HmppsUser): Promise<VisitLocation[]> {
    return this.get<VisitLocation[]>(
      { path: `/admin/prison/${prisonCode}/official-visit-locations` },
      asSystem(user.username),
    )
  }

  async getVisitSlot(visitSlotId: number, user: HmppsUser): Promise<VisitSlot> {
    return this.get<VisitSlot>({ path: `/admin/visit-slot/id/${visitSlotId}` }, asSystem(user.username))
  }

  async deleteVisitSlot(visitSlotId: number, user: HmppsUser) {
    return this.delete({ path: `/admin/visit-slot/id/${visitSlotId}` }, asSystem(user.username))
  }

  async deleteTimeSlot(timeSlotId: number, user: HmppsUser) {
    return this.delete({ path: `/admin/time-slot/${timeSlotId}` }, asSystem(user.username))
  }

  async checkForOverlappingVisits(
    prisonCode: string,
    prisonerNumber: string,
    visitDate: string,
    startTime: string,
    endTime: string,
    contactIds?: number[],
    existingOfficialVisitId?: number,
    user?: HmppsUser,
  ): Promise<OverlappingVisitsResponse> {
    return this.post<OverlappingVisitsResponse>(
      {
        path: `/official-visit/prison/${prisonCode}/overlapping`,
        data: {
          prisonerNumber,
          visitDate,
          startTime,
          endTime,
          contactIds: contactIds || [],
          existingOfficialVisitId: existingOfficialVisitId || 0,
        },
      },
      asSystem(user?.username),
    )
  }
}
