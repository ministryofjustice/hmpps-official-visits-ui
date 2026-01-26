import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'
import { simpleApiMock, simplePostApiMock } from '../testUtils'
import {
  ApprovedContact,
  AvailableSlot,
  FindByCriteriaResults,
  OfficialVisit,
  ReferenceDataItem,
} from '../../server/@types/officialVisitsApi/types'

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
  stubRefData: (group: string, response: ReferenceDataItem[]) =>
    simpleApiMock(`/official-visits-api/reference-data/group/${group}`, response),
  stubAvailableSlots: (response: AvailableSlot[]) => simpleApiMock(`/official-visits-api/available-slots/.*`, response),
  stubOfficialContacts: (response: ApprovedContact[]) =>
    simpleApiMock(`/official-visits-api/prisoner/.*/approved-relationships\\?relationshipType=O`, response),
  stubSocialContacts: (response: ApprovedContact[]) =>
    simpleApiMock(`/official-visits-api/prisoner/.*/approved-relationships\\?relationshipType=S`, response),
  stubFindByCriteria: (response: FindByCriteriaResults, bodyPatterns: object[], page: number = 0) => {
    return stubFor({
      request: {
        method: 'POST',
        urlPattern: `/official-visits-api/official-visit/prison/LEI/find-by-criteria\\?page=${page}&size=10.*`,
        bodyPatterns,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: response,
      },
    })
  },
  stubGetOfficialVisitById: (response: OfficialVisit) =>
    simpleApiMock(`/official-visits-api/official-visit/prison/LEI/id/.+`, response),
  stubCreateVisit: (response: OfficialVisit) =>
    simplePostApiMock(`/official-visits-api/official-visit/prison/LEI`, response),
}
