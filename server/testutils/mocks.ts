import { TimeSlot } from '../@types/officialVisitsApi/types'

export const prisoner = {
  firstName: 'John',
  lastName: 'Smith',
  prisonerNumber: 'A1337AA',
}

export const mockTimeslots = [
  {
    timeSlotId: 1,
    visitSlotId: 1,
    visitDate: '2025-12-25',
    startTime: '08:00',
    endTime: '17:00',
    description: 'Room 1',
  } as TimeSlot & { description: string },
]

export const mockSchedule = [
  {
    id: 1,
    startTime: '08:00',
    endTime: '17:00',
    eventName: 'ROTL - out of prison',
    typeCode: 'ACT',
    typeDescription: 'Activity',
    locationCode: 'OUT',
    locationDescription: 'Out of prison',
  },
]
