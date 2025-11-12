export type OfficialVisitJourney = {
  searchTerm?: string
  searchPage?: string
  officialVisitId?: number
  prisonCode?: string
  prisonName?: string
  visitStatusCode?: string
  visitStatusDescription?: string
  visitTypeCode?: string
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
  visitors?: JourneyVisitor[]
}

export type JourneyVisitor = {
  officialVisitorId?: number
  contactId?: number
  prisonerContactId?: number
  visitorTypeCode?: string
  visitorTypeDescription?: string
  relationshipTypeCode?: string
  relationshipTypeDescription?: string
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  equipment?: JourneyEquipment[]
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
}
