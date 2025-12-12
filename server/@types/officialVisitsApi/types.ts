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
export type CreateOfficialVisitRequest = components['schemas']['CreateOfficialVisitRequest']
