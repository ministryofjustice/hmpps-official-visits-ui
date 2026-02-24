import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'
import { simplePostApiMock } from '../testHelpers'
import { PrisonerScheduledEvents } from '../../server/@types/activitiesApi/types'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/activities-api/health/ping',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
  stubAvailableSlots: (response: PrisonerScheduledEvents) =>
    simplePostApiMock(`/activities-api/scheduled-events/prison/.*`, response),
}
