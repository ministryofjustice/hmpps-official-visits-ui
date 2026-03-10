import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'
import { RecursivePartial, simpleApiMock, simplePostApiMock } from '../testHelpers'
import {
  AvailableSlot,
  CancelTypeRequest,
  CompleteVisitRequest,
  FindByCriteriaResults,
  OfficialVisit,
  ReferenceDataItem,
  TimeSlot,
  TimeSlotSummary,
  VisitLocation,
  VisitSlot,
} from '../../server/@types/officialVisitsApi/types'
import { components } from '../../server/@types/officialVisitsApi'

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
  stubTimeSlotSummary: (response: Record<string, unknown>) =>
    simpleApiMock(`/official-visits-api/admin/time-slots/prison/.*`, response),
  stubAllContacts: (response: components['schemas']['PrisonerContact'][]) => {
    return Promise.all([
      simpleApiMock(`/official-visits-api/prisoner/.*/all-contacts.*`, response),
      simpleApiMock(`/official-visits-api/prisoner/.*/all-contacts?currentTerm=true`, response),
    ])
  },
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
  stubCompleteVisit: (response: RecursivePartial<CompleteVisitRequest>) =>
    simplePostApiMock(`/official-visits-api/official-visit/prison/LEI/id/\\d+/complete`, response),
  stubCancelVisit: (response: RecursivePartial<CancelTypeRequest>) =>
    simplePostApiMock(`/official-visits-api/official-visit/prison/LEI/id/\\d+/cancel`, response),
  stubUpdateVisitors: (prisonCode: string, visitId: string) =>
    stubFor({
      request: {
        method: 'PUT',
        urlPattern: `/official-visits-api/official-visit/prison/${prisonCode}/id/${visitId}/visitors`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {},
      },
    }),
  stubUpdateVisitTypeAndSlot: (prisonCode: string, visitId: string) =>
    stubFor({
      request: {
        method: 'PUT',
        urlPattern: `/official-visits-api/official-visit/prison/${prisonCode}/id/${visitId}/update-type-and-slot`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {},
      },
    }),
  stubUpdateComments: (prisonCode: string, visitId: string) =>
    stubFor({
      request: {
        method: 'PUT',
        urlPattern: `/official-visits-api/official-visit/prison/${prisonCode}/id/${visitId}/update-comments`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {},
      },
    }),
  stubUpdateVisitSlot: (visitSlotId: number) =>
    stubFor({
      request: {
        method: 'PUT',
        urlPattern: `/official-visits-api/admin/visit-slot/id/${visitSlotId}`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {},
      },
    }),
  stubGetVisitSlot: (visitSlotId: number, response: VisitSlot) =>
    simpleApiMock(`/official-visits-api/admin/visit-slot/id/${visitSlotId}`, response),
  stubCreateTimeSlot: (response: Record<string, unknown> = {}) =>
    simplePostApiMock(`/official-visits-api/admin/time-slot`, response),
  stubGetAllTimeSlotsAndVisitSlots: (response: TimeSlotSummary) =>
    simpleApiMock(`/official-visits-api/admin/time-slots/prison/.*`, response),
  stubCreateVisitSlot: (timeSlotId: number, response: RecursivePartial<VisitSlot>) =>
    simplePostApiMock(`/official-visits-api/admin/time-slot/${timeSlotId}/visit-slot`, response),
  stubGetOfficialVisitLocationsAtPrison: (prisonCode: string, response: RecursivePartial<VisitLocation[]>) =>
    simpleApiMock(`/official-visits-api/admin/prison/${prisonCode}/official-visit-locations`, response),
  stubGetPrisonTimeSlotById: (prisonTimeSlotId: number, response: RecursivePartial<TimeSlot>) =>
    simpleApiMock(`/official-visits-api/admin/time-slot/${prisonTimeSlotId}`, response),
}
