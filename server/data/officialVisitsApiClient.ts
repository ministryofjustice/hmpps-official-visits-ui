import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import { ApprovedContact, OfficialVisit, RefDataItem } from '../@types/officialVisitsApi/types'
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

  async createOfficialVisit(request: components['schemas']['CreateOfficialVisitRequest'], user: HmppsUser) {
    return this.post<components['schemas']['CreateOfficialVisitResponse']>(
      { path: `/official-visit`, data: request },
      asSystem(user.username),
    )
  }

  // Not a real endpoint at present - none exist - just for test support
  async getOfficialVisitById(officialVisitId: number, user: HmppsUser): Promise<OfficialVisit> {
    return this.get<OfficialVisit>({ path: `/official-visits/${officialVisitId}` }, asSystem(user.username))
  }

  async getReferenceData(code: components['schemas']['ReferenceDataGroup'], user: HmppsUser) {
    return this.get<RefDataItem[]>({ path: `/reference-data/group/${code}` }, asSystem(user.username))
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
    user: HmppsUser,
  ): Promise<components['schemas']['AvailableSlot'][]> {
    return this.get<components['schemas']['AvailableSlot'][]>(
      { path: `/available-slots/${prisonId}?fromDate=${startDate}&toDate=${endDate}&videoOnly=false` },
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
}
