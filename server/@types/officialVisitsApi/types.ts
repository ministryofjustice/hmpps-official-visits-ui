import { components } from '.'

export type OfficialVisit = components['schemas']['OfficialVisitDetails']

export type ReferenceDataItem = Partial<components['schemas']['ReferenceDataItem']>

export type ApprovedContact = components['schemas']['ApprovedContact']

export type AvailableSlot = components['schemas']['AvailableSlot']

export type ContactRelationship = {
  prisonerContactId: number
  assistanceNotes?: string
  assistedVisit?: boolean
  equipment?: boolean
  equipmentNotes?: string
}
export type RestrictionSummary = components['schemas']['RestrictionsSummary']

export type VisitStatusType = components['schemas']['VisitStatusType']
export type VisitType = components['schemas']['VisitType']
export type VisitCompletionType = components['schemas']['VisitCompletionType']
export type VisitorType = components['schemas']['VisitorType']
export type SearchLevelType = components['schemas']['SearchLevelType']
export type CreateOfficialVisitRequest = components['schemas']['CreateOfficialVisitRequest']
export type CreateOfficialVisitResponse = components['schemas']['CreateOfficialVisitResponse']
export type OfficialVisitor = components['schemas']['OfficialVisitor']
export type VisitorEquipment = components['schemas']['VisitorEquipment']
export type FindByCriteria = components['schemas']['OfficialVisitSummarySearchRequest']
export type FindByCriteriaResults = components['schemas']['PagedModelOfficialVisitSummarySearchResponse']
export type FindByCriteriaVisit = components['schemas']['OfficialVisitSummarySearchResponse']
export type CompleteVisitRequest = components['schemas']['OfficialVisitCompletionRequest']
export type CancelTypeRequest = components['schemas']['OfficialVisitCancellationRequest']
export type TimeSlotSummary = components['schemas']['TimeSlotSummary']
export type CreateTimeSlotRequest = components['schemas']['CreateTimeSlotRequest']
export type UpdateTimeSlotRequest = components['schemas']['UpdateTimeSlotRequest']
export type CreateVisitSlotRequest = components['schemas']['CreateVisitSlotRequest']
export type TimeSlot = components['schemas']['TimeSlot']
export type VisitSlot = components['schemas']['VisitSlot']
export type VisitLocation = components['schemas']['VisitLocation']
export type OfficialVisitUpdateVisitorsRequest = components['schemas']['OfficialVisitUpdateVisitorsRequest']
export type OfficialVisitUpdateSlotRequest = components['schemas']['OfficialVisitUpdateSlotRequest']
export type OfficialVisitUpdateCommentRequest = components['schemas']['OfficialVisitUpdateCommentRequest']
