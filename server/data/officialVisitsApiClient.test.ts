import nock from 'nock'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import OfficialVisitsApiClient from './officialVisitsApiClient'
import config from '../config'
import { HmppsUser } from '../interfaces/hmppsUser'

describe('OfficialVisitsApiClient', () => {
  let officialVisitsApiClient: OfficialVisitsApiClient
  let mockAuthenticationClient: jest.Mocked<AuthenticationClient>

  const user = { token: 'userToken', username: 'test' } as HmppsUser

  beforeEach(() => {
    mockAuthenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>

    officialVisitsApiClient = new OfficialVisitsApiClient(mockAuthenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  describe('getOfficialVisitById', () => {
    it('should get an official visit by ID and return the response body', async () => {
      const prisonCode = 'AAA'
      const visitId = 1
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .get(`/official-visit/prison/${prisonCode}/id/${visitId}`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.getOfficialVisitById('AAA', visitId, user)

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('getApprovedOfficialContacts', () => {
    it('should get a list of approved official contacts for a prisoner', async () => {
      const prisonerNumber = 'A1234AA'
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .get(`/prisoner/${prisonerNumber}/approved-relationships?relationshipType=O`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.getApprovedOfficialContacts('MDI', prisonerNumber, user)

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('getApprovedSocialContacts', () => {
    it('should get a list of approved social contacts for a prisoner', async () => {
      const prisonerNumber = 'A1234AA'
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .get(`/prisoner/${prisonerNumber}/approved-relationships?relationshipType=S`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.getApprovedSocialContacts('MDI', prisonerNumber, user)

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('completeVisit', () => {
    it('should complete an official visit', async () => {
      const prisonCode = 'AAA'
      const visitId = '1'
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .post(`/official-visit/prison/${prisonCode}/id/${visitId}/complete`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.completeVisit(
        prisonCode,
        visitId,
        {
          completionReason: 'NORMAL',
          prisonerAttendance: 'ATTENDED',
          visitorAttendance: [{ officialVisitorId: 1, visitorAttendance: 'ATTENDED' }],
          prisonerSearchType: 'FULL',
        },
        user,
      )

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateVisitors', () => {
    it('should update visitors for an official visit', async () => {
      const prisonCode = 'AAA'
      const visitId = '1'
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .put(`/official-visit/prison/${prisonCode}/id/${visitId}/visitors`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.updateVisitors(
        prisonCode,
        visitId,
        {
          officialVisitors: [
            {
              officialVisitorId: 1,
              visitorTypeCode: 'CONTACT',
              relationshipCode: 'POM',
            },
          ],
        },
        user,
      )

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateVisitTypeAndSlot', () => {
    it('should update visit type and slot for an official visit', async () => {
      const prisonCode = 'AAA'
      const visitId = '1'
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .put(`/official-visit/prison/${prisonCode}/id/${visitId}/update-type-and-slot`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.updateVisitTypeAndSlot(
        prisonCode,
        visitId,
        {
          prisonVisitSlotId: 123,
          visitDate: '2022-12-23',
          startTime: '10:00',
          endTime: '11:00',
          dpsLocationId: 'aaaa-bbbb-9f9f9f9f-9f9f9f9f',
          visitTypeCode: 'IN_PERSON',
        },
        user,
      )

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateComments', () => {
    it('should update comments for an official visit', async () => {
      const prisonCode = 'AAA'
      const visitId = '1'
      const expected = { data: 'data' }

      nock(config.apis.officialVisitsApi.url)
        .put(`/official-visit/prison/${prisonCode}/id/${visitId}/update-comments`)
        .matchHeader('authorization', 'Bearer test-system-token')
        .reply(200, expected)

      const response = await officialVisitsApiClient.updateComments(
        prisonCode,
        visitId,
        {
          staffNotes: 'Staff notes',
          prisonerNotes: 'Prisoner notes',
        },
        user,
      )

      expect(response).toEqual(expected)
      expect(mockAuthenticationClient.getToken).toHaveBeenCalledTimes(1)
    })
  })
})
