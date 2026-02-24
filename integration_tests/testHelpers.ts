import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './mockApis/wiremock'

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P]
}

export function apiMock<T>(method: string, urlPattern: string, response: RecursivePartial<T>): SuperAgentRequest {
  return stubFor({
    request: {
      method,
      urlPattern,
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: response,
    },
  })
}

export function simpleApiMock<T>(urlPattern: string, response: RecursivePartial<T>): SuperAgentRequest {
  return apiMock('GET', urlPattern, response)
}

export function simplePostApiMock<T>(urlPattern: string, response: RecursivePartial<T>): SuperAgentRequest {
  return apiMock('POST', urlPattern, response)
}
