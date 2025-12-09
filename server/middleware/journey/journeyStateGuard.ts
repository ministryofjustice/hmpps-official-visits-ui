import type { NextFunction, Request, Response } from 'express'
import { validate } from 'uuid'

export type JourneyStateGuard = { [pageName: string]: (req: Request) => string | undefined }

export function isMissingValues<T>(obj: T, keys: Array<keyof T>): boolean {
  return keys.some(key => obj?.[key] === undefined)
}

export default function journeyStateGuard(rules: JourneyStateGuard) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuidMatch = req.originalUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
    const uuid = uuidMatch?.[0]

    if (!uuid || !validate(uuid)) {
      // This page does not concern us
      return next()
    }

    const requestedPage = req.originalUrl.split('/').pop()
    const flow = req.originalUrl.substring(0, uuidMatch.index - 1)

    if (!requestedPage || !flow) {
      return next()
    }

    let redirectTo
    let latestValidPage = requestedPage

    while (latestValidPage !== null) {
      const guardFn = rules[latestValidPage] || rules['*']

      if (guardFn === undefined) {
        // We've backtracked all the way to a page that requires no validation
        if (requestedPage === latestValidPage) {
          return next()
        }
        return res.redirect(`${flow}/${uuid}${redirectTo}`)
      }

      const targetRedirect = guardFn(req)

      if (targetRedirect === undefined) {
        // We passed validation for this page, either redirect if we've had to backtrack or next() if not
        if (requestedPage === latestValidPage) {
          return next()
        }
        return res.redirect(`${flow}/${uuid}${redirectTo}`)
      }
      latestValidPage = targetRedirect.startsWith('/') ? targetRedirect.split('/')[1] || '' : targetRedirect
      redirectTo = targetRedirect
    }

    return next()
  }
}
