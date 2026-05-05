import type { Request, Response } from 'express'
import { v4 } from 'uuid'
import preventNavigationToMismatchedCaseloadsJourneys from './preventNavigationToMismatchedCaseloadsJourneys'

describe('preventNavigationToMismatchedCaseloadsJourneys', () => {
  const uuid = v4()
  let req: Request
  let next: jest.Mock

  function createReq(): Request {
    return {
      params: { journeyId: uuid },
      session: {
        journeyData: {},
        activeCaseLoadId: 'MDI',
      },
    } as unknown as jest.Mocked<Request>
  }

  function createRes(): Response {
    return {
      redirect: jest.fn(),
    } as unknown as Response
  }

  beforeEach(() => {
    req = createReq()
    next = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should call next when no journey exists for this URL', () => {
    const res = createRes()
    req.originalUrl = `/manage/create/${uuid}/search`

    preventNavigationToMismatchedCaseloadsJourneys()(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('should call next when journey caseload matches active caseload', () => {
    const res = createRes()
    req.session.journeyData[uuid] = {
      officialVisit: { caseLoad: 'MDI' },
      instanceUnixEpoch: Date.now(),
    }
    req.originalUrl = `/manage/create/${uuid}/search`

    preventNavigationToMismatchedCaseloadsJourneys()(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('should redirect to home when journey caseload does not match active caseload', () => {
    const res = createRes()
    req.session.journeyData[uuid] = {
      officialVisit: { caseLoad: 'HEI' },
      instanceUnixEpoch: Date.now(),
    }
    req.originalUrl = `/manage/create/${uuid}/search`

    preventNavigationToMismatchedCaseloadsJourneys()(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith('/')
    expect(next).not.toHaveBeenCalled()
  })
})
