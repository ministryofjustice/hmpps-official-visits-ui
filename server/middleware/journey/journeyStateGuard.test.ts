import { NextFunction, Request, Response } from 'express'
import journeyStateGuard from './journeyStateGuard'

let req: Request
let res: Response
let next: NextFunction

beforeEach(() => {
  res = {
    redirect: jest.fn(),
  } as unknown as Response

  req = {
    baseUrl: '',
    url: '',
    session: {
      journey: {},
    },
  } as unknown as Request

  next = jest.fn()
})

describe('journeyStateGuard', () => {
  it('should do nothing if the requested page is not inside a journey', async () => {
    const middleware = journeyStateGuard({})
    req.originalUrl = '/second-part-of-uri'

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('should do nothing if the requested page has a malformed journey id', async () => {
    const middleware = journeyStateGuard({})
    req.originalUrl = '/zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz/second-part-of-uri'

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('should do nothing if no guard is specified for the requested page', async () => {
    const middleware = journeyStateGuard({})
    req.originalUrl = '/test/0af172bf-becf-4e49-b1f3-0ac961e07535/page'

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('should allow access to the requested page if the guard has been satisfied', async () => {
    const middleware = journeyStateGuard({
      page: () => undefined,
    })
    req.originalUrl = '/test/0af172bf-becf-4e49-b1f3-0ac961e07535/page'

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('should redirect if the guard for the requested page is not satisifed', async () => {
    const middleware = journeyStateGuard({
      page: () => '/redirect',
    })
    req.originalUrl = '/test/0af172bf-becf-4e49-b1f3-0ac961e07535/page'

    middleware(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith('/test/0af172bf-becf-4e49-b1f3-0ac961e07535/redirect')
    expect(next).not.toHaveBeenCalled()
  })

  it('should handle a chain of redirects without making the client go through each redirect', async () => {
    const middleware = journeyStateGuard({
      level2: () => '/level1',
      level3: () => '/level2',
      'check-your-answers': () => '/level3',
    })
    req.originalUrl = '/test/0af172bf-becf-4e49-b1f3-0ac961e07535/check-your-answers'

    middleware(req, res, next)

    expect(res.redirect).toHaveBeenCalledWith('/test/0af172bf-becf-4e49-b1f3-0ac961e07535/level1')
    expect(next).not.toHaveBeenCalled()
  })
})
