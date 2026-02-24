import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'
import { simplePostApiMock } from '../testHelpers'
import { PagedModelPrisonerRestrictionDetails } from '../../server/@types/personalRelationshipsApi/types'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/personal-relationships-api/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  stubRestrictions: (restrictions: PagedModelPrisonerRestrictionDetails = {}) =>
    simplePostApiMock(`/personal-relationships-api/prisoner-restrictions/.*`, restrictions),
}
