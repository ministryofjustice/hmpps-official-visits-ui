import type { NextFunction, Request, Response } from 'express'

export default function insertJourneyModeContext(mode: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.routeContext = { ...req.routeContext, mode }
    return next()
  }
}
