import { Router } from 'express'
import type { Services } from '../../../../services'
import { PageHandler } from '../../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../../middleware/logPageViewMiddleware'
import PrisonerSearchHandler from './handlers/prisonerSearchHandler'
import PrisonerSearchResultsHandler from './handlers/prisonerSearchResultsHandler'
import { validate } from '../../../../middleware/validationMiddleware'

export default function Routes({ auditService, prisonerService }: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validate(handler.SCHEMA), handler.POST)

  route('/search', new PrisonerSearchHandler(prisonerService))

  // Prisoner search journey is required in session for the following routes
  router.use((req, res, next) => {
    if (!req.session.journey.prisonerSearch) {
      return res.redirect('/')
    }
    return next()
  })

  route('/results', new PrisonerSearchResultsHandler(prisonerService))

  return router
}
