import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'
import { PagePrisoner, Prisoner } from '../../server/@types/prisonerSearchApi/types'
import { RecursivePartial, simpleApiMock } from '../testHelpers'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/prisoner-search-api/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),

  stubSearchInCaseload: (response: RecursivePartial<PagePrisoner>) =>
    simpleApiMock(`/prisoner-search-api/prison/LEI/prisoners.*`, response),
  stubGetByPrisonerNumber: (response: RecursivePartial<Prisoner>) =>
    simpleApiMock(`/prisoner-search-api/prisoner/.*`, response),
}
