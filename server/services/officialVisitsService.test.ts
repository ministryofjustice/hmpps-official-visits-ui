import OfficialVisitsApiClient from '../data/officialVisitsApiClient'
import OfficialVisitsService from './officialVisitsService'
import { HmppsUser } from '../interfaces/hmppsUser'
import { ApprovedContact, OfficialVisit } from '../@types/officialVisitsApi/types'

jest.mock('../data/officialVisitsApiClient')

const user = { token: 'userToken', username: 'test' } as HmppsUser

describe('OfficialVisitsService', () => {
  let officialVisitsApiClient: jest.Mocked<OfficialVisitsApiClient>
  let officialVisitsService: OfficialVisitsService

  beforeEach(() => {
    officialVisitsApiClient = new OfficialVisitsApiClient(null) as jest.Mocked<OfficialVisitsApiClient>
    officialVisitsService = new OfficialVisitsService(officialVisitsApiClient)
  })

  it('should call get official visits by ID on the official visits API client and return its result', async () => {
    const visitId = 1
    const expected = {
      officialVisitId: 1,
      prisonCode: 'AAA',
      prisonDescription: 'Example Prison',
      visitStatus: 'SCHEDULED',
      visitStatusDescription: 'Scheduled',
      visitTypeCode: 'VIDEO',
      visitTypeDescription: 'Video',
      visitDate: '2025-12-04',
      startTime: '09:00:00',
      endTime: '10:00:00',
      dpsLocationId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      locationDescription: 'Example Prison',
      visitSlotId: 1,
      staffNotes: null,
      prisonerNotes: null,
      visitorConcernNotes: null,
      completionCode: null,
      completionDescription: 'null',
      searchTypeCode: 'RUB_A',
      searchTypeDescription: 'Rubdown level A',
      createdTime: '2025-12-04T10:39:59.448838',
      createdBy: 'TIM',
      updatedTime: null,
      updatedBy: null,
      officialVisitors: [
        {
          visitorTypeCode: 'CONTACT',
          visitorTypeDescription: 'Contact',
          firstName: 'Adam',
          lastName: 'Adams',
          contactId: 20085662,
          prisonerContactId: 7331628,
          relationshipTypeCode: 'OFFICIAL',
          relationshipTypeDescription: 'Official',
          relationshipCode: 'CUSP',
          leadVisitor: true,
          assistedVisit: false,
          visitorNotes: null,
          attendanceCode: null,
          attendanceDescription: 'null',
          createdBy: 'TIM',
          createdTime: '2025-12-04T10:39:59.448838',
          updatedBy: null,
          updatedTime: null,
          offenderVisitVisitorId: null,
        },
      ],
      prisonerVisited: {
        prisonerNumber: 'A1111AA',
        prisonCode: 'AAA',
        firstName: 'JOHN',
        lastName: 'DOE',
        dateOfBirth: '1986-06-27',
        cellLocation: '2-1-007',
        middleNames: 'JOHNSON',
        offenderBookId: null,
        attendanceCode: 'null',
        attendanceCodeDescription: 'null',
      },
    } as OfficialVisit

    officialVisitsApiClient.getOfficialVisitById.mockResolvedValue(expected)

    const result = await officialVisitsService.getOfficialVisitById('AAA', visitId, user)

    expect(officialVisitsApiClient.getOfficialVisitById).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })

  it('should get approved official relationships for a prisoner', async () => {
    const prisonerNumber = 'A1234AA'
    const expected = [
      {
        contactId: 1,
        prisonerContactId: 1,
        relationshipTypeCode: 'O',
        relationshipTypeDescription: 'Official',
        firstName: 'Bob',
        lastName: 'Smith',
      } as ApprovedContact,
    ]
    officialVisitsApiClient.getApprovedOfficialContacts.mockResolvedValue(expected)

    const result = await officialVisitsService.getApprovedOfficialContacts('MDI', prisonerNumber, user)

    expect(officialVisitsApiClient.getApprovedOfficialContacts).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })

  it('should get approved social relationships for a prisoner', async () => {
    const prisonerNumber = 'A1234AA'
    const expected = [
      {
        contactId: 1,
        prisonerContactId: 1,
        relationshipTypeCode: 'S',
        relationshipTypeDescription: 'Social',
        firstName: 'Bob',
        lastName: 'Smith',
      } as ApprovedContact,
    ]
    officialVisitsApiClient.getApprovedSocialContacts.mockResolvedValue(expected)

    const result = await officialVisitsService.getApprovedSocialContacts('MDI', prisonerNumber, user)

    expect(officialVisitsApiClient.getApprovedSocialContacts).toHaveBeenCalledTimes(1)
    expect(result).toEqual(expected)
  })
})
