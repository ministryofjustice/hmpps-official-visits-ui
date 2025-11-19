import { components } from '../../../../@types/officialVisitsApi'
import { ContactPlaceholder, RestrictionPlaceholder } from '../../../../data/officialVisitsApiClient'

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
  // Split social and official up to relfect the two different pages
  officialVisitors?: JourneyVisitor[]
  socialVisitors?: JourneyVisitor[]
  availableSlots?: components['schemas']['AvailableSlot'][]
  selectedTimeSlot?: components['schemas']['AvailableSlot']
}

export type JourneyVisitor = ContactPlaceholder & {
  equipment?: boolean // Figma designs point at plaintext notes for now - this is subject to change
  equipmentNotes?: string
  assistedVisit?: boolean // undefined means the data has not been specified yet
  assistanceNotes?: string
  leadVisitor?: boolean
  notes?: string
}

export type JourneyEquipment = {
  visitorEquipmentId?: number
  equipmentTypeCode?: string
  equipmentTypeDescription?: string
  model?: string
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
  restrictions?: RestrictionPlaceholder[]
  contacts?: ContactPlaceholder[]
}
