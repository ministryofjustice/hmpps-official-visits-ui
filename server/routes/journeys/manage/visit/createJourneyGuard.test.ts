import { Journey } from '../../../../@types/express'
import { ApprovedContact } from '../../../../@types/officialVisitsApi/types'
import { recallContacts, savePrisonerSelection, saveVisitors, saveVisitType } from './createJourneyGuard'

describe('Create Journey Guard', () => {
  const mockJourney = () => {
    return {
      officialVisit: {
        searchPage: '1',
        searchTerm: 'data',
        visitType: 'SOCIAL',
        visitTypeDescription: 'Social',
        selectedTimeSlot: {
          timeSlotId: 1,
          visitSlotId: 1,
        },
        prisoner: {
          firstName: 'John',
          lastName: 'Smith',
          prisonerNumber: 'A1234AA',
          prisonCode: 'AAA',
          prisonName: 'Test Prison',
        },
        officialVisitors: [
          {
            prisonerContactId: 1,
            firstName: 'John',
            lastName: 'Smith',
            assistedVisit: false,
            relationshipTypeCode: 'O',
            relationshipTypeDescription: 'Official',
            equipment: true,
            equipmentNotes: 'equipment notes (official)',
            assistanceNotes: 'assistance (official)',
          },
        ],
        socialVisitors: [
          {
            prisonerContactId: 2,
            firstName: 'John',
            lastName: 'Smith',
            assistedVisit: false,
            relationshipTypeCode: 'S',
            relationshipTypeDescription: 'Social',
            equipment: true,
            equipmentNotes: 'equipment notes (social)',
            assistanceNotes: 'assistance (social)',
          },
        ],
        assistancePageCompleted: true,
        equipmentPageCompleted: true,
        prisonerNotes: 'prisoner notes',
        commentsPageCompleted: true,
        socialVisitorsPageCompleted: true,
      },
    } as Journey
  }

  it('should keep only searchPage and searchTerm when setting a new prisoner', () => {
    const journey = mockJourney()
    savePrisonerSelection(journey, {
      firstName: 'John',
      lastName: 'Smith',
      prisonerNumber: 'A1234AA',
      prisonCode: 'AAA',
      prisonName: 'Test Prison',
    })
    expect(journey.officialVisit).toEqual({
      searchPage: '1',
      searchTerm: 'data',
      prisonCode: 'AAA',
      prisonName: 'Test Prison',
      prisoner: {
        firstName: 'John',
        lastName: 'Smith',
        prisonerNumber: 'A1234AA',
        prisonCode: 'AAA',
        prisonName: 'Test Prison',
      },
    })
  })

  it('should delete later pages when setting a visit type', () => {
    const journey = mockJourney()
    saveVisitType(journey, { code: 'SOCIAL', description: 'Social' })
    expect(journey.officialVisit).toEqual({
      searchPage: '1',
      searchTerm: 'data',
      visitType: 'SOCIAL',
      visitTypeDescription: 'Social',
      prisoner: journey.officialVisit.prisoner,
    })
  })

  it('should delete later pages when setting a time slot', () => {
    const journey = mockJourney()
    saveVisitType(journey, { code: 'SOCIAL', description: 'Social' })
    expect(journey.officialVisit).toEqual({
      searchPage: '1',
      searchTerm: 'data',
      visitType: 'SOCIAL',
      visitTypeDescription: 'Social',
      prisoner: journey.officialVisit.prisoner,
    })
  })

  it('should reset assistance and equipment pages when setting official visitors', () => {
    const journey = mockJourney()
    saveVisitors(journey, 'O', journey.officialVisit.officialVisitors)
    expect(journey.officialVisit).toEqual({
      searchPage: '1',
      searchTerm: 'data',
      visitType: 'SOCIAL',
      visitTypeDescription: 'Social',
      prisoner: journey.officialVisit.prisoner,
      commentsPageCompleted: true,
      officialVisitors: journey.officialVisit.officialVisitors,
      prisonerNotes: journey.officialVisit.prisonerNotes,
      selectedTimeSlot: journey.officialVisit.selectedTimeSlot,
      socialVisitors: journey.officialVisit.socialVisitors,
    })
  })

  it('should reset assistance and equipment pages when setting social visitors', () => {
    const journey = mockJourney()
    saveVisitors(journey, 'S', journey.officialVisit.socialVisitors)
    expect(journey.officialVisit).toEqual({
      searchPage: '1',
      searchTerm: 'data',
      visitType: 'SOCIAL',
      visitTypeDescription: 'Social',
      prisoner: journey.officialVisit.prisoner,
      commentsPageCompleted: true,
      officialVisitors: journey.officialVisit.officialVisitors,
      prisonerNotes: journey.officialVisit.prisonerNotes,
      selectedTimeSlot: journey.officialVisit.selectedTimeSlot,
      socialVisitors: journey.officialVisit.socialVisitors,
      socialVisitorsPageCompleted: true,
    })
  })

  it('should combine previously saved assistance and equipment pages with fresh official contact data', () => {
    const journey = mockJourney()
    const actual = recallContacts(journey, 'O', [{ prisonerContactId: 1 } as ApprovedContact])

    expect(actual).toEqual([
      {
        prisonerContactId: 1,
        assistedVisit: false,
        equipment: true,
        equipmentNotes: 'equipment notes (official)',
        assistanceNotes: 'assistance (official)',
      },
    ])
  })

  it('should combine previously saved assistance and equipment pages with fresh social contact data', () => {
    const journey = mockJourney()
    const actual = recallContacts(journey, 'S', [{ prisonerContactId: 2 } as ApprovedContact])

    expect(actual).toEqual([
      {
        prisonerContactId: 2,
        assistedVisit: false,
        equipment: true,
        equipmentNotes: 'equipment notes (social)',
        assistanceNotes: 'assistance (social)',
      },
    ])
  })
})
