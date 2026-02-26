import { Request, Response } from 'express'

export const getBackLink = (req: Request, res: Response, fallback: string) => {
  const change = req.session.journey.amendVisit?.changePage
  if (change) {
    return change === res.locals.currentPage ? `./` : fallback
  }
  return fallback
}
