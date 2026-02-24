// Create mock data with one visit at each location, status, type and date for two people (32 visits)
import { FindByCriteriaVisit } from '../../server/@types/officialVisitsApi/types'

const locations = [
  {
    code: '9485cf4a-750b-4d74-b594-59bacbcda247',
    description: 'First Location',
  },
  {
    code: '0199bed0-4927-7361-998a-4deddbfbbbf3',
    description: 'Second Location',
  },
]

const statuses = [
  { code: 'COMPLETED', description: 'Completed' },
  { code: 'SCHEDULED', description: 'Scheduled' },
]

const visitTypes = [
  { code: 'VIDEO', description: 'Video' },
  { code: 'NOTVIDEO', description: 'Not video' },
]

const completionCodes = [
  { code: 'NORMAL', description: 'Normal' },
  { code: 'VISITOR_CANCELLED', description: 'Cancelled by visitor' },
]

const searchLevels = [
  { code: 'FULL', description: 'Full' },
  { code: 'RUB_DOWN', description: 'Rub down' },
]

const mockPrisoner = {
  prisonerNumber: 'A1111AA',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1989-06-01',
  cellLocation: 'LEI-1-1',
  pncNumber: '429',
  croNumber: '123456/12A',
  prisonId: 'LEI',
  prisonName: 'Example Prison (EXP)',
}

const mockVisit = {
  officialVisitId: 294,
  prisonCode: 'MDI',
  prisonDescription: 'Moorland (HMP & YOI)',
  visitDate: '2022-12-23',
  startTime: '10:00',
  endTime: '11:00',
  visitSlotId: 1,
  staffNotes: 'Legal representation details',
  prisonerNotes: 'Please arrive 10 minutes early',
  visitorConcernNotes: 'string',
  numberOfVisitors: 3,
  completionCode: 'VISITOR_CANCELLED',
  completionDescription: 'string',
  createdBy: 'Fred Bloggs',
  createdTime: '2025-12-02 14:45',
  updatedBy: 'Jane Bloggs',
  updatedTime: '22025-12-04 09:50',
  prisoner: mockPrisoner,
}

const defaultStartDate = new Date().toISOString().substring(0, 10)
const defaultEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)

const generateMockData = (): FindByCriteriaVisit[] => {
  const combos = [
    new Date(2026, 0, 1).toISOString().substring(0, 10),
    new Date().toISOString().substring(0, 10),
  ].flatMap(date =>
    locations.flatMap(loc =>
      statuses.flatMap(status =>
        visitTypes.flatMap(type => ['John', 'Jane'].map(name => ({ date, loc, status, type, name }))),
      ),
    ),
  )

  return Array.from({ length: combos.length }, (_, i) => {
    const { loc, status, type, name, date } = combos[i % combos.length]

    return {
      ...mockVisit,
      officialVisitId: i + 1,
      visitDate: date,
      dpsLocationId: loc.code,
      locationDescription: loc.description,
      visitStatus: status.code,
      visitStatusDescription: status.description,
      visitTypeCode: type.code,
      visitTypeDescription: type.description,
      prisoner: {
        ...mockVisit.prisoner,
        firstName: name,
        prisonCode: 'LEI',
        prisonerNumber: 'A1111AA',
      },
    } as FindByCriteriaVisit
  })
}

export {
  generateMockData,
  locations,
  statuses,
  visitTypes,
  completionCodes,
  searchLevels,
  mockPrisoner,
  mockVisit,
  defaultStartDate,
  defaultEndDate,
}
