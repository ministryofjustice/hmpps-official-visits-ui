import { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

export default {
  stubComponentsFail: (): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        url: '/components/components?component=header&component=footer',
      },
      response: {
        status: 500,
      },
    }),

  stubComponents: (): SuperAgentRequest =>
    stubFor({
      request: {
        method: 'GET',
        url: '/components/components?component=header&component=footer',
      },
      response: {
        status: 200,
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
            services: [],
          },
          header: {
            html: '<header>Sign in <a href="/sign-out">Sign out</a></header>',
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
