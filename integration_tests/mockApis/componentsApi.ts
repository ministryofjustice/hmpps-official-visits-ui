import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubComponentsFail: (httpStatus: number = 500): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/components/components\\?component=header&component=footer',
      },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      },
    }),

  stubComponents: (httpStatus: number = 200): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        urlPattern: '/components/components\\?component=header&component=footer',
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
                id: 'official-visits',
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
