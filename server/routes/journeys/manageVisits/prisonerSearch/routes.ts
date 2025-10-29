import { Router } from 'express'
import type { Services } from '../../../../services'
import { PageHandler } from '../../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../../middleware/validationMiddleware'
import PrisonerSearchHandler from './handlers/prisonerSearchHandler'
import PrisonerSearchResultsHandler from './handlers/prisonerSearchResultsHandler'
import PrisonerNotListedHandler from './handlers/prisonerNotListedHandler'

export default function Routes({ auditService, prisonerService }: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  route('/search', new PrisonerSearchHandler(prisonerService))

  // Prisoner search journey is required in session for the following routes
  router.use((req, res, next) => {
    if (!req.session.journey.prisonerSearch) {
      return res.redirect('/')
    }
    return next()
  })

  route('/results', new PrisonerSearchResultsHandler(prisonerService))
  route('/prisoner-not-listed', new PrisonerNotListedHandler())

  return router
}
