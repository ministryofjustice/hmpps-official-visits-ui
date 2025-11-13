import type { NextFunction, Request, RequestHandler, Response } from 'express'

export default function preventNavigationToExpiredJourneys(excludePatterns: RegExp[] = []): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const journeyId = req.originalUrl?.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1]
    if (
      req.session.journeyData?.[journeyId]?.journeyCompleted &&
      excludePatterns.every(itm => !req.originalUrl?.match(itm))
    ) {
      return res.redirect('/')
    }

    return next()
  }
}
