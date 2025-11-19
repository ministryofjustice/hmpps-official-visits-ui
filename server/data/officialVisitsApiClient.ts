import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import { HmppsUser } from '../interfaces/hmppsUser'
import { OfficialVisit, RefDataItem } from '../@types/officialVisitsApi/types'
import { components } from '../@types/officialVisitsApi'

export type RestrictionPlaceholder = {
  contactId: number
  typeCode: string
  typeDescription: string
  comments: string
  startDate: string
  endDate?: string
}

/** This can be re-used for both official contact and social contact */
export type ContactPlaceholder = {
  id: number
  firstName: string
  lastName: string
  dateOfBirth: string // Use dateOfBirth from the API and then map to Over 18 in the official contact view
  relationshipTypeCode: string
  relationshipTypeDescription: string
  address: string // probably a combination of street, area, city, county, postcode fields
  visitorTypeCode: 'SOCIAL' | 'OFFICIAL'
  visitorTypeDescription: 'Social' | 'Official'
  restrictions?: RestrictionPlaceholder[] // Could also map these client side
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

  createOfficialVisit(request: components['schemas']['CreateOfficialVisitRequest'], user: HmppsUser) {
    return this.post<components['schemas']['CreateOfficialVisitResponse']>(
      { path: `/official-visit`, data: request },
      asSystem(user.username),
    )
  }

  // Not a real endpoint at present - none exist - just for test support
  getOfficialVisitById(officialVisitId: number, user: HmppsUser): Promise<OfficialVisit> {
    return this.get<OfficialVisit>({ path: `/official-visits/${officialVisitId}` }, asSystem(user.username))
  }

  getReferenceData(code: components['schemas']['ReferenceDataGroup'], user: HmppsUser) {
    return this.get<RefDataItem[]>({ path: `/reference-data/group/${code}` }, asSystem(user.username))
  }

  getSchedule(_prisonId: string, _date: string, _user: HmppsUser): Promise<ScheduleItemPlaceholder[]> {
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

  getAvailableTimeSlots(
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

  getActiveRestrictions(
    _prisonId: string,
    _prisonerNumber: string,
    _user: HmppsUser,
  ): Promise<RestrictionPlaceholder[]> {
    return Promise.resolve([
      {
        contactId: 3,
        typeCode: 'CLOSED',
        typeDescription: 'Closed',
        comments: 'Closed with Time Write',
        startDate: '2022-12-01',
        endDate: '2022-12-31',
      },
      {
        contactId: 1,
        typeCode: 'RES',
        typeDescription: 'Resctricted',
        comments: 'Not to contact Sarah Philips until 03/08/2026.',
        startDate: '2017-10-17',
      },
    ])
    // return this.get<RestrictionPlaceholder[]>({ path: `/prison/${prisonId}/prisoner/${prisonerNumber}/restrictions` }, asSystem(user.username))
  }

  getContacts(_prisonId: string, _prisonerNumber: string, _user: HmppsUser): Promise<ContactPlaceholder[]> {
    return Promise.resolve([
      {
        id: 1,
        visitorTypeCode: 'OFFICIAL',
        visitorTypeDescription: 'Official',
        firstName: 'Sarah',
        lastName: 'Philips',
        dateOfBirth: '1980-01-01',
        relationshipTypeDescription: 'Family lawyer',
        relationshipTypeCode: 'FLAWYER',
        address: '123 Highbury Hill, London, N5 1AT',
      },
      {
        id: 2,
        visitorTypeCode: 'OFFICIAL',
        visitorTypeDescription: 'Official',
        firstName: 'Michael',
        lastName: 'Phillips',
        dateOfBirth: '1980-01-01',
        relationshipTypeCode: 'SOL',
        relationshipTypeDescription: 'Solicitor',
        address: '123 Highbury Hill, London, N5 1AT',
      },
      {
        id: 3,
        visitorTypeCode: 'SOCIAL',
        visitorTypeDescription: 'Social',
        firstName: 'Tim',
        lastName: 'Wright',
        dateOfBirth: '1970-01-01',
        relationshipTypeCode: 'BRO',
        relationshipTypeDescription: 'Brother',
        address: '123 Highbury Hill, London, N5 1AT',
      },
      {
        id: 4,
        visitorTypeCode: 'SOCIAL',
        visitorTypeDescription: 'Social',
        firstName: 'Wendy',
        lastName: 'Zayna',
        dateOfBirth: '1984-12-22',
        relationshipTypeCode: 'FRI',
        relationshipTypeDescription: 'Friend',
        address: '84 Street, Sheffield, S1 4DD',
      },
    ])
    // return this.get<RestrictionPlaceholder[]>({ path: `/prison/{prisonerNumber}/contact-relationships` }, asSystem(user.username))
  }
}
