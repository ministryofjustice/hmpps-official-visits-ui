import { NextFunction, Request, Response } from 'express'
import { FLASH_KEY__VALIDATION_ERRORS } from '../setUpFlash'

/**
 * Wraps res.redirect and res.render to redirect to check-your-answers page if
 * check answers page has been reached in the current journey and there are no validation errors.
 * @param excludePaths An array of regexs for this middleware to not activate on
 */
export default function redirectCheckAnswersMiddleware(excludePaths: RegExp[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.originalUrl || excludePaths.some(itm => req.originalUrl.match(itm))) {
      return next()
    }

    const subPaths = req.originalUrl.split('/')
    const journeyIdIndex = subPaths.findIndex(itm =>
      itm.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/),
    )

    if (journeyIdIndex === -1) {
      return next()
    }

    const journeyId = subPaths[journeyIdIndex]
    const checkAnswersUrl = [...subPaths.slice(0, journeyIdIndex), journeyId, `check-your-answers`].join('/')

    const resRender = res.render
    res.render = (view: string, options?) => {
      if (
        options &&
        'backUrl' in options &&
        options.backUrl &&
        req.session.journeyData?.[journeyId]?.reachedCheckAnswers
      ) {
        resRender.call(res, view, { ...options, backUrl: checkAnswersUrl } as never)
      } else {
        resRender.call(res, view, options as never)
      }
    }

    const resRedirect: (status: number, url: string) => void = res.redirect
    res.redirect = (param1: string | number, param2?: string | number) => {
      const url = (typeof param1 === 'string' ? param1 : param2) as string
      // eslint-disable-next-line no-nested-ternary
      const status = typeof param1 === 'number' ? param1 : typeof param2 === 'number' ? param2 : undefined

      const referer = req.get?.('Referer')?.split('?')[0]
      const originalUrl = req.originalUrl?.split('?')[0]

      if (referer?.endsWith(originalUrl)) {
        return resRedirect(param1 as number, param2 as string)
      }

      const errors = req.flash(FLASH_KEY__VALIDATION_ERRORS)
      if (errors.length) {
        req.flash(FLASH_KEY__VALIDATION_ERRORS, errors[0]!)
      }

      return resRedirect.call(
        res,
        status || 302,
        req.session.journeyData?.[journeyId]?.reachedCheckAnswers && !errors.length ? checkAnswersUrl : url,
      )
    }

    return next()
  }
}
