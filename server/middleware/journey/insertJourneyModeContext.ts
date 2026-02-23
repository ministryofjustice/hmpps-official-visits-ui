import type { NextFunction, Request, Response } from 'express'

export default function insertJourneyModeContext(mode: 'create' | 'amend') {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.routeContext = { ...req.routeContext, mode }
    res.locals.mode = mode
    return next()
  }
}
