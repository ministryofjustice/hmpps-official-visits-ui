import { NextFunction, Request, Response } from 'express'
import { v4 } from 'uuid'
import redirectCheckAnswersMiddleware from './redirectCheckAnswers'

let req: Request
let next: NextFunction
const uuid = v4()

beforeEach(() => {
  req = {
    baseUrl: '',
    url: '',
    originalUrl: '',
    session: { journeyData: { [uuid]: {} } },
    flash: (): unknown[] => [],
    params: { journeyId: uuid },
  } as unknown as Request

  next = jest.fn()
})

const middleware = redirectCheckAnswersMiddleware([/ignoreThisPage/])

describe('redirectCheckAnswers', () => {
  it('should do nothing if page not is part of a journey', async () => {
    req.originalUrl = `notPartOfAJourney/shouldDoNothing`

    const originalResRender = jest.fn()
    const originalResRedirect = jest.fn()
    const res = { render: originalResRender, redirect: originalResRedirect } as unknown as Response
    middleware(req, res, next)
    res.render('view', { backUrl: 'not-cya' })
    res.redirect('expect-no-change')

    expect(originalResRender).toHaveBeenCalledWith('view', { backUrl: `not-cya` })
    expect(originalResRedirect).toHaveBeenCalledWith('expect-no-change')
  })

  it('should do nothing if check answers has not been reached', async () => {
    req.originalUrl = `journeyName/mode/${uuid}/ignoreThisPage`

    const originalResRender = jest.fn()
    const originalResRedirect = jest.fn()
    const res = { render: originalResRender, redirect: originalResRedirect } as unknown as Response
    middleware(req, res, next)
    res.render('view', { backUrl: 'not-cya' })
    res.redirect('expect-no-change')

    expect(originalResRender).toHaveBeenCalledWith('view', { backUrl: `not-cya` })
    expect(originalResRedirect).toHaveBeenCalledWith('expect-no-change')
  })

  it('should do nothing if target url is included in excludePaths', async () => {
    req.originalUrl = `journeyName/mode/${uuid}/ignoreThisPage`

    const originalResRender = jest.fn()
    const originalResRedirect = jest.fn()
    const res = { render: originalResRender, redirect: originalResRedirect } as unknown as Response
    middleware(req, res, next)
    res.render('view', { backUrl: 'not-cya' })
    res.redirect('expect-no-change')

    expect(originalResRender).toHaveBeenCalledWith('view', { backUrl: `not-cya` })
    expect(originalResRedirect).toHaveBeenCalledWith('expect-no-change')
  })

  it('should do nothing if redirecting to same page as referer', async () => {
    req.originalUrl = `notPartOfAJourney/shouldDoNothing`
    req.session.journeyData[uuid].reachedCheckAnswers = true

    const originalResRender = jest.fn()
    const originalResRedirect = jest.fn()
    const res = { render: originalResRender, redirect: originalResRedirect } as unknown as Response
    middleware(req, res, next)
    res.render('view', { backUrl: 'not-cya' })
    res.redirect('shouldDoNothing')

    expect(originalResRender).toHaveBeenCalledWith('view', { backUrl: `not-cya` })
    expect(originalResRedirect).toHaveBeenCalledWith('shouldDoNothing')
  })

  it('should call res.render with a backUrl of check-your-answers when check answers has been reached', async () => {
    req.originalUrl = `journeyName/mode/${uuid}/standardPage`
    req.session.journeyData[uuid].reachedCheckAnswers = true

    const originalResRender = jest.fn()
    const res = { render: originalResRender, redirect: jest.fn() } as unknown as Response
    middleware(req, res, next)
    res.render('view', { backUrl: 'not-cya' })

    expect(originalResRender).toHaveBeenCalledWith('view', { backUrl: `journeyName/mode/${uuid}/check-your-answers` })
  })

  it('should call res.redirect with check-your-answers when check answers has been reached', async () => {
    req.originalUrl = `journeyName/mode/${uuid}/standardPage`
    req.session.journeyData[uuid].reachedCheckAnswers = true

    const originalResRedirect = jest.fn()
    const res = { render: jest.fn(), redirect: originalResRedirect } as unknown as Response
    middleware(req, res, next)
    res.redirect('expect-to-be-redirected')

    expect(originalResRedirect).toHaveBeenCalledWith(302, `journeyName/mode/${uuid}/check-your-answers`)
  })
})
