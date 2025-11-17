import { NextFunction, Request, Response } from 'express'
import insertJourneyIdentifier from './insertJourneyIdentifier'

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
  } as unknown as Request

  next = jest.fn()
})

describe('insertJourneyIdentifier', () => {
  it('should generate a new journey id, insert UUID segment and redirect', async () => {
    const middleware = insertJourneyIdentifier()
    req.baseUrl = '/test'
    req.url = '/second-part-of-uri'

    middleware(req, res, next)

    expect(res.redirect).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/test\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/second-part-of-uri/),
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next if uuid already exists in the url', async () => {
    const middleware = insertJourneyIdentifier()
    req.baseUrl = '/test'
    req.url = '/0af172bf-becf-4e49-b1f3-0ac961e07535/second-part-of-uri'

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
