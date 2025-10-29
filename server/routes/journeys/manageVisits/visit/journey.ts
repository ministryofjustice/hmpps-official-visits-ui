export type OfficialVisitJourney = {
  officialVisitId?: number
  prisonCode?: string
  visitStatus?: string
  visitType?: string
  prisoner?: {
    firstName: string
    lastName: string
    prisonerNumber?: string
    dateOfBirth: string
  }
  visitDate?: string
  startTime?: string
  endTime?: string
  visitSlotId?: number
  timeSlotId?: number
}
