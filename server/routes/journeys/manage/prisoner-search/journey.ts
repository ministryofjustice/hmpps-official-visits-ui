/**
 * This journey object is populated when searching for a prisoner.
 * Initially the search term is populated, and the remaining fields completed when the prisoner is selected.
 */
export type PrisonerSearchJourney = {
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  prisonCode?: string
  prisonName?: string
  prisonerNumber?: string
  pncNumber?: string
  croNumber?: string
  cellLocation?: string
  searchTerm?: string
}
