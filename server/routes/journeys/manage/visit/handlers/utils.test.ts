import { Request, Response } from 'express'
import { getBackLink } from './utils'

const getMockRequest = (changePage?: string) => {
  if (changePage) {
    return { session: { journey: { amendVisit: { changePage } } } } as unknown as Request
  }
  return { session: { journey: {} } } as unknown as Request
}

const getMockResponse = (currentPage: string) => ({ locals: { currentPage } }) as unknown as Response

describe('utils', () => {
  it('should return back (./) when changePage is the same as currentPage', () => {
    expect(getBackLink(getMockRequest('same-page'), getMockResponse('same-page'), 'not-used')).toEqual(`./`)
  })

  it('should return fallback when changePage is not the same as currentPage', () => {
    expect(getBackLink(getMockRequest('not-same-page'), getMockResponse('same-page'), 'fallback-used')).toEqual(
      `fallback-used`,
    )
  })

  it('should return fallback when changePage is not set', () => {
    expect(getBackLink(getMockRequest(), getMockResponse('some-page'), 'fallback-used')).toEqual(`fallback-used`)
  })
})
