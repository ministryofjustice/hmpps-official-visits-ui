import {
  TimeSlot,
  TimeSlotSummary,
  TimeSlotSummaryItem,
  VisitLocation,
  VisitSlot,
} from '../../server/@types/officialVisitsApi/types'

export const prisonTimeSlot: TimeSlot = {
  prisonTimeSlotId: 1,
  prisonCode: 'LEI',
  dayCode: 'MON',
  effectiveDate: '2024-01-01',
  expiryDate: '2025-01-01',
  startTime: '10:00',
  endTime: '11:00',
  createdBy: 'TEST_USER',
  createdTime: '2024-01-01T10:00:00Z',
}

export const visitSlotNoVisits: VisitSlot = {
  visitSlotId: 1,
  prisonCode: 'LEI',
  prisonTimeSlotId: 1,
  dpsLocationId: '1',
  locationDescription: 'Room 1',
  locationType: 'ROOM',
  locationMaxCapacity: 2,
  maxAdults: 2,
  maxGroups: 1,
  maxVideo: 0,
  hasVisit: false,
  createdBy: 'TEST_USER',
  createdTime: '2026-01-01T09:00:00Z',
}

export const visitSlotWithVisits: VisitSlot = {
  visitSlotId: 1,
  prisonCode: 'LEI',
  prisonTimeSlotId: 1,
  dpsLocationId: '1',
  locationDescription: 'Room 1',
  locationType: 'ROOM',
  locationMaxCapacity: 2,
  maxAdults: 2,
  maxGroups: 1,
  maxVideo: 0,
  hasVisit: true,
  createdBy: 'TEST_USER',
  createdTime: '2026-01-01T09:00:00Z',
}

export const timeSlotSummaryNoVisits: TimeSlotSummaryItem = {
  timeSlot: {
    prisonTimeSlotId: 1,
    prisonCode: 'LEI',
    dayCode: 'MON',
    startTime: '09:00',
    endTime: '10:00',
    effectiveDate: '2026-01-01',
    expiryDate: '2026-12-31',
    createdBy: 'TEST_USER',
    createdTime: '2026-01-01T09:00:00Z',
    updatedBy: 'TEST_USER',
    updatedTime: '2026-01-02T10:00:00Z',
  },
  visitSlots: [visitSlotNoVisits],
}

export const timeSlotWithVisits: TimeSlotSummaryItem = {
  timeSlot: {
    prisonTimeSlotId: 1,
    prisonCode: 'LEI',
    dayCode: 'MON',
    startTime: '09:00',
    endTime: '10:00',
    effectiveDate: '2026-01-01',
    expiryDate: '2026-12-31',
    createdBy: 'TEST_USER',
    createdTime: '2026-01-01T09:00:00Z',
    updatedBy: 'TEST_USER',
    updatedTime: '2026-01-02T10:00:00Z',
  },
  visitSlots: [visitSlotWithVisits],
}

export const timeSlotSummaryWithVisits: TimeSlotSummary = {
  prisonCode: 'LEI',
  prisonName: 'Leeds (HMP)',
  timeSlots: [timeSlotWithVisits],
}

export const visitLocations: VisitLocation[] = [
  { locationId: 'loc-1', locationName: 'Visit room 1' },
  { locationId: 'loc-2', locationName: 'Visit room 2' },
]

// MDI variants used by time slot specs
export const timeSlotSummaryMdi: TimeSlotSummary = {
  prisonCode: 'MDI',
  prisonName: 'Moorland',
  timeSlots: [
    {
      timeSlot: {
        dayCode: 'MON',
        prisonTimeSlotId: 3,
        startTime: '09:00',
        endTime: '10:00',
        effectiveDate: '2026-01-01',
        expiryDate: null as unknown as string,
        prisonCode: 'MDI',
        createdBy: 'test',
        createdTime: '2026-01-01T09:00:00',
      },
      visitSlots: [],
    },
  ],
}

// Variant where the time slot has no visitSlots associated (used to test deleting a time slot)
export const timeSlotSummaryNoVisitSlots: TimeSlotSummary = {
  prisonCode: 'LEI',
  prisonName: 'Leeds (HMP)',
  timeSlots: [
    {
      timeSlot: {
        prisonTimeSlotId: 1,
        prisonCode: 'LEI',
        dayCode: 'MON',
        startTime: '09:00',
        endTime: '10:00',
        effectiveDate: '2026-01-01',
        expiryDate: '2026-12-31',
        createdBy: 'TEST_USER',
        createdTime: '2026-01-01T09:00:00Z',
        updatedBy: 'TEST_USER',
        updatedTime: '2026-01-02T10:00:00Z',
      },
      visitSlots: [],
    },
  ],
}
