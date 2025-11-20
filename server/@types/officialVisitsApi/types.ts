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

export type AvailableTimeSlots = {
  dayCode: string
  startTime: string
  endTime: string
  dpsLocationId: string
  maxAdults: string
  maxGroups: string
}

export type RefDataItem = Partial<components['schemas']['ReferenceDataItem']>
export type ApprovedContact = components['schemas']['ApprovedContact']
