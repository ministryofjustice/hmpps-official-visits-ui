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
