import { PrisonerRestrictionDetails } from '../../../../@types/personalRelationshipsApi/types'
import { ApprovedContact, AvailableSlot, VisitStatusType, VisitType } from '../../../../@types/officialVisitsApi/types'

export type AmendVisitJourney = {
  backTo?: string
  /** The page that the last "change" link navigated to */
  changePage?: string
}

export type OfficialVisitJourney = {
  searchTerm?: string
  searchPage?: string
  officialVisitId?: number
  prisonCode?: string
  prisonName?: string
  visitStatusCode?: VisitStatusType
  visitStatusDescription?: string
  visitType?: VisitType
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
  availableSlots?: AvailableSlot[]
  selectedTimeSlot?: Partial<AvailableSlot>
  // Pages are optional but we need to ensure they are shown at least once
  assistancePageCompleted?: boolean
  equipmentPageCompleted?: boolean
  socialVisitorsPageCompleted?: boolean
  commentsPageCompleted?: boolean
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
