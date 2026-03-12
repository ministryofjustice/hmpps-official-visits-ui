import { Journey } from '../../../../@types/express'
import { ApprovedContact, AvailableSlot, VisitType } from '../../../../@types/officialVisitsApi/types'
import {
  recallContacts,
  savePrisonerSelection,
  saveVisitors,
  saveVisitType,
  saveTimeSlot,
  checkVideoCapacity,
  checkTelephoneCapacity,
  checkInPersonCapacity,
  checkSlotCapacity,
  filterAvailableSlots,
} from './createJourneyState'

describe('Create Journey Guard', () => {
  const mockJourney = () => {
    return {
      officialVisit: {
        searchPage: '1',
        searchTerm: 'data',
        visitType: 'SOCIAL' as VisitType,
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

  it('should delete selectedTimeSlot and locationDescription when setting a visit type', () => {
    const journey = mockJourney()
    saveVisitType(journey, { code: 'SOCIAL', description: 'Social' })
    expect(journey.officialVisit).toEqual({
      searchPage: '1',
      searchTerm: 'data',
      visitType: 'SOCIAL',
      visitTypeDescription: 'Social',
      prisoner: journey.officialVisit.prisoner,
      officialVisitors: journey.officialVisit.officialVisitors,
      socialVisitors: journey.officialVisit.socialVisitors,
      assistancePageCompleted: true,
      equipmentPageCompleted: true,
      prisonerNotes: 'prisoner notes',
      commentsPageCompleted: true,
      socialVisitorsPageCompleted: true,
    })
  })

  it('should set time slot and location description', () => {
    const journey = mockJourney()
    const timeSlot = {
      timeSlotId: 2,
      visitSlotId: 2,
      locationDescription: 'New Location',
    } as AvailableSlot
    saveTimeSlot(journey, timeSlot)
    expect(journey.officialVisit.selectedTimeSlot).toEqual(timeSlot)
    expect(journey.officialVisit.locationDescription).toBe('New Location')
  })

  it('should set official visitors', () => {
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
      assistancePageCompleted: true,
      equipmentPageCompleted: true,
    })
  })

  it('should set social visitors', () => {
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
      assistancePageCompleted: true,
      equipmentPageCompleted: true,
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

describe('Capacity Check Functions', () => {
  const mockSlot = {
    visitSlotId: 1,
    timeSlotId: 1,
    prisonCode: 'MDI',
    dayCode: 'MON',
    dayDescription: 'Monday',
    visitDate: '2026-01-26',
    startTime: '13:30',
    endTime: '16:00',
    dpsLocationId: 'loc1',
    availableVideoSessions: 2,
    availableAdults: 3,
    availableGroups: 2,
  }

  describe('checkVideoCapacity', () => {
    it('should return true when video sessions are available', () => {
      expect(checkVideoCapacity(mockSlot)).toBe(true)
    })

    it('should return false when no video sessions are available', () => {
      const slotWithNoVideo = { ...mockSlot, availableVideoSessions: 0 }
      expect(checkVideoCapacity(slotWithNoVideo)).toBe(false)
    })
  })

  describe('checkTelephoneCapacity', () => {
    it('should return true when both groups and adults are available', () => {
      expect(checkTelephoneCapacity(mockSlot)).toBe(true)
    })

    it('should return false when no groups are available', () => {
      const slotWithNoGroups = { ...mockSlot, availableGroups: 0 }
      expect(checkTelephoneCapacity(slotWithNoGroups)).toBe(false)
    })

    it('should return false when no adults are available', () => {
      const slotWithNoAdults = { ...mockSlot, availableAdults: 0 }
      expect(checkTelephoneCapacity(slotWithNoAdults)).toBe(false)
    })

    it('should return false when neither groups nor adults are available', () => {
      const slotWithNoCapacity = { ...mockSlot, availableGroups: 0, availableAdults: 0 }
      expect(checkTelephoneCapacity(slotWithNoCapacity)).toBe(false)
    })
  })

  describe('checkInPersonCapacity', () => {
    it('should return true when enough adults and groups are available', () => {
      expect(checkInPersonCapacity(mockSlot, 2)).toBe(true)
    })

    it('should return true when exactly enough adults are available', () => {
      const slotWithExactAdults = { ...mockSlot, availableAdults: 2 }
      expect(checkInPersonCapacity(slotWithExactAdults, 2)).toBe(true)
    })

    it('should return false when not enough adults are available', () => {
      expect(checkInPersonCapacity(mockSlot, 4)).toBe(false)
    })

    it('should return false when no groups are available', () => {
      const slotWithNoGroups = { ...mockSlot, availableGroups: 0 }
      expect(checkInPersonCapacity(slotWithNoGroups, 2)).toBe(false)
    })

    it('should return false when neither adults nor groups are sufficient', () => {
      const slotWithNoCapacity = { ...mockSlot, availableAdults: 1, availableGroups: 0 }
      expect(checkInPersonCapacity(slotWithNoCapacity, 2)).toBe(false)
    })
  })

  describe('checkSlotCapacity', () => {
    it('should return true for video visit with capacity', () => {
      expect(checkSlotCapacity(mockSlot, 'VIDEO', 1)).toBe(true)
    })

    it('should return false for video visit with no capacity', () => {
      const slotWithNoVideo = { ...mockSlot, availableVideoSessions: 0 }
      expect(checkSlotCapacity(slotWithNoVideo, 'VIDEO', 1)).toBe(false)
    })

    it('should return true for telephone visit with capacity', () => {
      expect(checkSlotCapacity(mockSlot, 'TELEPHONE', 1)).toBe(true)
    })

    it('should return false for telephone visit with no capacity', () => {
      const slotWithNoGroups = { ...mockSlot, availableGroups: 0 }
      expect(checkSlotCapacity(slotWithNoGroups, 'TELEPHONE', 1)).toBe(false)
    })

    it('should return true for in-person visit with capacity', () => {
      expect(checkSlotCapacity(mockSlot, 'IN_PERSON', 2)).toBe(true)
    })

    it('should return false for in-person visit with no capacity', () => {
      expect(checkSlotCapacity(mockSlot, 'IN_PERSON', 4)).toBe(false)
    })

    it('should treat unknown visit type as in-person', () => {
      expect(checkSlotCapacity(mockSlot, 'UNKNOWN' as VisitType, 2)).toBe(true)
    })
  })

  describe('filterAvailableSlots', () => {
    const slots = [
      mockSlot,
      { ...mockSlot, visitSlotId: 2, availableVideoSessions: 0 },
      { ...mockSlot, visitSlotId: 3, availableGroups: 0 },
      { ...mockSlot, visitSlotId: 4, availableAdults: 1 },
    ]

    it('should filter video visit slots correctly', () => {
      const filtered = filterAvailableSlots(slots, 'VIDEO', 1)
      expect(filtered).toHaveLength(3) // All except slot 2 which has no video capacity
      expect(filtered.map(s => s.visitSlotId)).toEqual([1, 3, 4])
    })

    it('should filter telephone visit slots correctly', () => {
      const filtered = filterAvailableSlots(slots, 'TELEPHONE', 1)
      expect(filtered).toHaveLength(3) // Slots 1, 2, and 4 have both groups and adults
      expect(filtered.map(s => s.visitSlotId)).toEqual([1, 2, 4])
    })

    it('should filter in-person visit slots correctly', () => {
      const filtered = filterAvailableSlots(slots, 'IN_PERSON', 2)
      expect(filtered).toHaveLength(2) // Slots 1 and 2 have enough adults (3), slot 4 only has 1
      expect(filtered.map(s => s.visitSlotId)).toEqual([1, 2])
    })

    it('should return empty array when no slots have capacity', () => {
      const filtered = filterAvailableSlots(slots, 'IN_PERSON', 5)
      expect(filtered).toHaveLength(0)
    })

    it('should return all slots when all have capacity', () => {
      const filtered = filterAvailableSlots(slots, 'IN_PERSON', 1)
      expect(filtered).toHaveLength(3) // All except slot 3 which has no groups
      expect(filtered.map(s => s.visitSlotId)).toEqual([1, 2, 4])
    })
  })
})
