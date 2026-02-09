import { Response } from 'express'
import OfficialVisitsApiClient from '../data/officialVisitsApiClient'
import { HmppsUser } from '../interfaces/hmppsUser'
import {
  CancelTypeRequest,
  CompleteVisitRequest,
  CreateOfficialVisitRequest,
  CreateOfficialVisitResponse,
  FindByCriteria,
  OfficialVisit,
  OfficialVisitor,
  SearchLevelType,
  VisitorEquipment,
  VisitorType,
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
      officialVisitors: [...sessionVisit.officialVisitors, ...sessionVisit.socialVisitors].map(o => ({
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

  public async getAvailableSlots(
    res: Response,
    prisonId: string,
    startDate: string,
    endDate: string,
    videoOnly: boolean,
  ) {
    return this.officialVisitsApiClient.getAvailableTimeSlots(prisonId, startDate, endDate, videoOnly, res.locals.user)
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

  /*
   ** Stubbed response - same as the reconcile slots response for a prison
   ** with added attributes - prison description, locationDescriptions, and maxVideo capacities
   ** Will implement as an endpoint (like /reconcile/time-slots/prison/{prisonCode}?activeOnly=true
   */
  public async getVisitSlotsAtPrison(prisonId: string, user: HmppsUser) {
    logger.info(`Get visits slots called by ${user.userId} ${user.displayName}`)
    return {
      prisonCode: prisonId,
      timeSlots: [
        {
          timeSlot: {
            prisonTimeSlotId: 1,
            prisonCode: 'MDI',
            dayCode: 'MON',
            startTime: '09:00',
            endTime: '10:00',
            effectiveDate: '2024-01-01',
            createdBy: 'XXX',
            createdTime: '2024-01-01T00:00:00Z',
          },
          visitSlots: [
            {
              visitSlotId: 1,
              prisonCode: 'MDI',
              prisonTimeSlotId: 1,
              dpsLocationId: 'aaa-ddd-bbb-123455632323',
              locationDescription: 'Official visits',
              maxAdults: 8,
              maxGroups: 4,
              maxVideo: 3,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 2,
              prisonCode: 'MDI',
              prisonTimeSlotId: 1,
              dpsLocationId: 'aaa-ddd-bbb-123455632311',
              locationDescription: 'Closed visits',
              maxAdults: 0,
              maxGroups: 0,
              maxVideo: 2,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 3,
              prisonCode: 'MDI',
              prisonTimeSlotId: 1,
              dpsLocationId: 'aaa-ddd-bbb-123455632322',
              locationDescription: 'Video visits',
              maxAdults: 10,
              maxGroups: 10,
              maxVideo: 10,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
          ],
        },
        {
          timeSlot: {
            prisonTimeSlotId: 2,
            prisonCode: 'MDI',
            dayCode: 'MON',
            startTime: '10:00',
            endTime: '11:00',
            effectiveDate: '2024-01-01',
            createdBy: 'XXX',
            createdTime: '2024-01-01T00:00:00Z',
          },
          visitSlots: [
            {
              visitSlotId: 4,
              prisonCode: 'MDI',
              prisonTimeSlotId: 2,
              dpsLocationId: 'aaa-ddd-bbb-123455632323',
              locationDescription: 'Official visits',
              maxAdults: 8,
              maxGroups: 4,
              maxVideo: 3,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 5,
              prisonCode: 'MDI',
              prisonTimeSlotId: 2,
              dpsLocationId: 'aaa-ddd-bbb-123455632311',
              locationDescription: 'Closed visits',
              maxAdults: 0,
              maxGroups: 0,
              maxVideo: 2,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 6,
              prisonCode: 'MDI',
              prisonTimeSlotId: 2,
              dpsLocationId: 'aaa-ddd-bbb-123455632322',
              locationDescription: 'Video visits',
              maxAdults: 10,
              maxGroups: 10,
              maxVideo: 10,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
          ],
        },
        {
          timeSlot: {
            prisonTimeSlotId: 3,
            prisonCode: 'MDI',
            dayCode: 'TUE',
            startTime: '10:00',
            endTime: '11:00',
            effectiveDate: '2024-01-01',
            expiryDate: '2026-03-01',
            createdBy: 'XXX',
            createdTime: '2024-01-01T00:00:00Z',
          },
          visitSlots: [
            {
              visitSlotId: 7,
              prisonCode: 'MDI',
              prisonTimeSlotId: 3,
              dpsLocationId: 'aaa-ddd-bbb-123455632323',
              locationDescription: 'Official visits',
              maxAdults: 8,
              maxGroups: 4,
              maxVideo: 3,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 8,
              prisonCode: 'MDI',
              prisonTimeSlotId: 3,
              dpsLocationId: 'aaa-ddd-bbb-123455632311',
              locationDescription: 'Closed visits',
              maxAdults: 0,
              maxGroups: 0,
              maxVideo: 2,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 9,
              prisonCode: 'MDI',
              prisonTimeSlotId: 3,
              dpsLocationId: 'aaa-ddd-bbb-123455632322',
              locationDescription: 'Video visits',
              maxAdults: 10,
              maxGroups: 10,
              maxVideo: 10,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
          ],
        },
        {
          timeSlot: {
            prisonTimeSlotId: 4,
            prisonCode: 'MDI',
            dayCode: 'THU',
            startTime: '09:00',
            endTime: '10:00',
            effectiveDate: '2024-01-01',
            expiryDate: '2026-03-01',
            createdBy: 'XXX',
            createdTime: '2024-01-01T00:00:00Z',
          },
          visitSlots: [
            {
              visitSlotId: 10,
              prisonCode: 'MDI',
              prisonTimeSlotId: 4,
              dpsLocationId: 'aaa-ddd-bbb-123455632323',
              locationDescription: 'Official visits',
              maxAdults: 8,
              maxGroups: 4,
              maxVideo: 3,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 11,
              prisonCode: 'MDI',
              prisonTimeSlotId: 4,
              dpsLocationId: 'aaa-ddd-bbb-123455632311',
              locationDescription: 'Closed visits',
              maxAdults: 0,
              maxGroups: 0,
              maxVideo: 2,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 12,
              prisonCode: 'MDI',
              prisonTimeSlotId: 4,
              dpsLocationId: 'aaa-ddd-bbb-123455632322',
              locationDescription: 'Video visits',
              maxAdults: 10,
              maxGroups: 10,
              maxVideo: 10,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
          ],
        },
        {
          timeSlot: {
            prisonTimeSlotId: 5,
            prisonCode: 'MDI',
            dayCode: 'FRI',
            startTime: '14:00',
            endTime: '15:30',
            effectiveDate: '2024-01-01',
            expiryDate: '2026-03-01',
            createdBy: 'XXX',
            createdTime: '2024-01-01T00:00:00Z',
          },
          visitSlots: [
            {
              visitSlotId: 13,
              prisonCode: 'MDI',
              prisonTimeSlotId: 5,
              dpsLocationId: 'aaa-ddd-bbb-123455632323',
              locationDescription: 'Official visits',
              maxAdults: 4,
              maxGroups: 2,
              maxVideo: 1,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 14,
              prisonCode: 'MDI',
              prisonTimeSlotId: 5,
              dpsLocationId: 'aaa-ddd-bbb-123455632311',
              locationDescription: 'Closed visits',
              maxAdults: 6,
              maxGroups: 6,
              maxVideo: 6,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
            {
              visitSlotId: 15,
              prisonCode: 'MDI',
              prisonTimeSlotId: 5,
              dpsLocationId: 'aaa-ddd-bbb-123455632322',
              locationDescription: 'Video visits',
              maxAdults: 12,
              maxGroups: 12,
              maxVideo: 12,
              createdBy: 'admin',
              createdTime: '2024-01-01T00:00:00Z',
              updatedBy: 'admin',
              updatedTime: '2024-01-01T00:00:00Z',
            },
          ],
        },
      ],
    }
  }
}
