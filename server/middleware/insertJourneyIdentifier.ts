import type { NextFunction, Request, Response } from 'express'
import { v4, validate } from 'uuid'

export default function insertJourneyIdentifier() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuid = req.url.split('/')[1]
    if (!validate(uuid)) {
      return res.redirect(`${req.baseUrl}/${v4()}${req.url}`)
    }
    return next()
  }
}
