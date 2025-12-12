import { components } from '.'

// For testing API client only
export type OfficialVisit = {
  officialVisitId: number
  prisonCode: string
  prisonName: string
  prisonerNumber: string
  visitStatusCode: string
  visitStatusDescription: string
  visitType: string
  visitTypeDescription: string
  visitDate: string
  startTime: string
  endTime: string
  visitSlotId: number
  timeSlotId: number
  dpsLocationId: string
  staffNotes: string
  prisonerNotes: string
}

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
export type RelationshipType = components['schemas']['RelationshipType']
export type SearchLevelType = components['schemas']['SearchLevelType']
export type CreateOfficialVisitRequest = components['schemas']['CreateOfficialVisitRequest']
export type OfficialVisitor = components['schemas']['OfficialVisitor']
export type VisitorEquipment = components['schemas']['VisitorEquipment']
