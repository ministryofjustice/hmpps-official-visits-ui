import type { Request, Response, NextFunction } from 'express'
import type { SanitisedError } from '@ministryofjustice/hmpps-rest-client'
import logger from '../logger'

export default function createErrorHandler(production: boolean) {
  return (error: SanitisedError & { status?: number }, req: Request, res: Response, next: NextFunction): void => {
    logger.error(`Error handling request for '${req.originalUrl}', user '${res.locals.user?.username}'`, error)

    const status = error.responseStatus ?? error.status

    if (status === 401 || status === 403) {
      logger.info('Logging user out')
      return res.redirect('/sign-out')
    }

    res.locals.message = production
      ? 'Something went wrong. The error has been logged. Please try again'
      : error.message
    res.locals.status = status
    res.locals.stack = production ? null : error.stack

    res.status(status || 500)

    return res.render('pages/error')
  }
}
