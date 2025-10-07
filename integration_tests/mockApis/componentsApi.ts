import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubComponentsFail: (httpStatus = 500): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        url: '/components/components?component=header&component=footer',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      },
    }),

  stubComponents: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        url: '/components/components?component=header&component=footer',
      },
      response: {
        status: httpStatus,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        jsonBody: {
          meta: {
            caseLoads: [
              {
                caseLoadId: 'LEI',
                description: 'Leeds (HMP)',
                currentlyActive: true,
              },
            ],
            activeCaseLoad: {
              caseLoadId: 'LEI',
              description: 'Leeds (HMP)',
              currentlyActive: true,
            },
            services: [
              {
                id: 'allocate-key-workers',
              },
              {
                id: 'allocate-personal-officers',
              },
            ],
          },
          header: {
            html: '',
            css: [''],
            javascript: [''],
          },
          footer: {
            html: '',
            css: [''],
            javascript: [],
          },
        },
      },
    }),
}
