import { components } from '../../../../@types/officialVisitsApi'
import { PrisonerRestrictionDetails } from '../../../../@types/personalRelationshipsApi/types'
import { ApprovedContact } from '../../../../@types/officialVisitsApi/types'

export type OfficialVisitJourney = {
  searchTerm?: string
  searchPage?: string
  officialVisitId?: number
  prisonCode?: string
  prisonName?: string
  visitStatusCode?: string
  visitStatusDescription?: string
  visitType?: string
  visitTypeDescription?: string
  visitDate?: string
  startTime?: string
  endTime?: string
  visitSlotId?: number
  timeSlotId?: number
  dpsLocationId?: string
  locationDescription?: string
  prisoner?: JourneyPrisoner
  staffNotes?: string
  prisonerNotes?: string
  officialVisitors?: JourneyVisitor[]
  socialVisitors?: JourneyVisitor[]
  availableSlots?: components['schemas']['AvailableSlot'][]
  selectedTimeSlot?: components['schemas']['AvailableSlot']
}
/*
 Define the additional data over and above the ApprovedContact structure for each visitor.
 The same type is used for official and social visitors.
 They can be differentiated through the relationshipTypeCode 'O' or 'S' in ApprovedContact.
 */
export type JourneyVisitor = ApprovedContact & {
  equipment?: boolean
  equipmentNotes?: string
  assistedVisit?: boolean
  assistanceNotes?: string
  leadVisitor?: boolean
  notes?: string
}

export type JourneyPrisoner = {
  prisonerNumber?: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  cellLocation?: string
  pncNumber?: string
  croNumber?: string
  prisonCode?: string
  restrictions?: PrisonerRestrictionDetails[]
  prisonName?: string
  restrictionsCount?: number
  alertsCount?: number
}
