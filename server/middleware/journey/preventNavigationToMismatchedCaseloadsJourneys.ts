import type { NextFunction, Request, RequestHandler, Response } from 'express'

export default function preventNavigationToMismatchedCaseloadsJourneys(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const journeyId = req.originalUrl?.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1]
    const journey = req.session.journeyData?.[journeyId]
    const caseLoadMatches = journey?.officialVisit?.caseLoad === req.session.activeCaseLoadId
    if (journey && req.session.activeCaseLoadId && journey?.officialVisit?.caseLoad && !caseLoadMatches) {
      return res.redirect('/')
    }

    return next()
  }
}
