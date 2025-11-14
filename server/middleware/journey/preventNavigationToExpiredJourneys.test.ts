import type { Request, Response } from 'express'
import { v4 } from 'uuid'
import preventNavigationToExpiredJourneys from './preventNavigationToExpiredJourneys'

describe('preventNavigationToExpiredJourneys', () => {
  const uuid = v4()
  const req: Request = { params: { journeyId: uuid }, session: { journeyData: {} } } as unknown as jest.Mocked<Request>
  const next = jest.fn()

  function createRes(): Response {
    return {
      redirect: jest.fn(),
    } as unknown as Response
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should ignore most recent journey page when redirecting when journey has been marked completed', () => {
    const res = createRes()
    req.session.journeyData[uuid] = {
      journeyCompleted: true,
      instanceUnixEpoch: Date.now(),
    }

    req.originalUrl = `/key-worker/${uuid}/manage-roles/remove/page`

    preventNavigationToExpiredJourneys()(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith(`/`)
  })

  it('should do nothing if journey is not completed', () => {
    const res = createRes()
    req.session.journeyData[uuid] = {
      journeyCompleted: false,
      instanceUnixEpoch: Date.now(),
    }

    req.originalUrl = `/key-worker/${uuid}/manage-roles/remove/page`

    preventNavigationToExpiredJourneys()(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('should do nothing if on journey confirmation page', () => {
    const res = createRes()
    req.session.journeyData[uuid] = {
      journeyCompleted: false,
      instanceUnixEpoch: Date.now(),
    }

    req.originalUrl = `/key-worker/${uuid}/manage-roles/remove/confirmation`

    preventNavigationToExpiredJourneys()(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
  })
})
