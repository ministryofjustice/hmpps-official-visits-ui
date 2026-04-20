import type { Request, Response } from 'express'

import serviceEnabledMiddleware from './serviceEnabledMiddleware'

// Mock the config at the top level
jest.mock('../config', () => ({
  featureToggles: {
    dpsEnabledPrisons: 'MDI,BXI',
  },
}))

describe('serviceEnabledMiddleware', () => {
  let req: Request
  const next = jest.fn()

  function createResWithUser({
    activeCaseLoadId,
    activeCaseLoadDescription,
  }: {
    activeCaseLoadId: string
    activeCaseLoadDescription: string
  }): Response {
    return {
      locals: {
        user: {
          activeCaseLoadId,
          activeCaseLoad: {
            description: activeCaseLoadDescription,
          },
        },
      },
      render: jest.fn(),
    } as unknown as Response
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should call next when prison is enabled', () => {
    const res = createResWithUser({ activeCaseLoadId: 'MDI', activeCaseLoadDescription: 'Moorland (HMP & YOI)' })

    serviceEnabledMiddleware()(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.render).not.toHaveBeenCalled()
  })

  it('should render notEnabled page when prison is not enabled', () => {
    const res = createResWithUser({ activeCaseLoadId: 'LEI', activeCaseLoadDescription: 'Leeds (HMP)' })

    serviceEnabledMiddleware()(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.render).toHaveBeenCalledWith('pages/notEnabled', {
      user: res.locals.user,
      serviceName: 'Official Visits',
      prisonName: 'Leeds',
    })
  })

  it('should extract prison name correctly from description with parentheses', () => {
    const res = createResWithUser({
      activeCaseLoadId: 'NOT_ENABLED',
      activeCaseLoadDescription: 'Some Prison (HMP & YOI)',
    })

    serviceEnabledMiddleware()(req, res, next)

    expect(res.render).toHaveBeenCalledWith('pages/notEnabled', {
      user: res.locals.user,
      serviceName: 'Official Visits',
      prisonName: 'Some Prison',
    })
  })

  it('should handle prison name without parentheses', () => {
    const res = createResWithUser({ activeCaseLoadId: 'NOT_ENABLED', activeCaseLoadDescription: 'Simple Prison Name' })

    serviceEnabledMiddleware()(req, res, next)

    expect(res.render).toHaveBeenCalledWith('pages/notEnabled', {
      user: res.locals.user,
      serviceName: 'Official Visits',
      prisonName: 'Simple Prison Name',
    })
  })

  it('should handle multiple enabled prisons', () => {
    const res1 = createResWithUser({ activeCaseLoadId: 'MDI', activeCaseLoadDescription: 'Moorland (HMP & YOI)' })
    const res2 = createResWithUser({ activeCaseLoadId: 'BXI', activeCaseLoadDescription: 'Brixton (HMP)' })

    serviceEnabledMiddleware()(req, res1, next)
    expect(next).toHaveBeenCalled()
    expect(res1.render).not.toHaveBeenCalled()

    jest.resetAllMocks()
    serviceEnabledMiddleware()(req, res2, next)
    expect(next).toHaveBeenCalled()
    expect(res2.render).not.toHaveBeenCalled()
  })
})
