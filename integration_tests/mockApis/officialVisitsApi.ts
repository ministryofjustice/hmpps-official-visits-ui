import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'
import { simpleApiMock } from '../testUtils'
import { ApprovedContact, AvailableTimeSlot, RefDataItem } from '../../server/@types/officialVisitsApi/types'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/official-visits-api/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  stubRefData: (group: string, response: RefDataItem[]) =>
    simpleApiMock(`/official-visits-api/reference-data/group/${group}`, response),
  stubAvailableSlots: (response: AvailableTimeSlot[]) =>
    simpleApiMock(`/official-visits-api/available-slots/.*`, response),
  stubOfficialContacts: (response: ApprovedContact[]) =>
    simpleApiMock(`/official-visits-api/prisoner/.*/approved-relationships\\?relationshipType=O`, response),
  stubSocialContacts: (response: ApprovedContact[]) =>
    simpleApiMock(`/official-visits-api/prisoner/.*/approved-relationships\\?relationshipType=S`, response),
}
