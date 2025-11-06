import { Router } from 'express'
import { parseISO } from 'date-fns'
import type { Services } from '../../../../services'
import { PageHandler } from '../../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../../middleware/logPageViewMiddleware'
import CheckCancelHandler from './handlers/checkCancelHandler'
import ConfirmCancelledHandler from './handlers/confirmCancelledHandler'
import { validate } from '../../../../middleware/validationMiddleware'

export default function CancelRoutes({ auditService, prisonerService, officialVisitsService }: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validate(handler.SCHEMA), handler.POST)

  route('/confirmation', new ConfirmCancelledHandler(officialVisitsService, prisonerService))

  router.use((req, res, next) => {
    const { officialVisitId, visitDate, startTime, visitStatusCode } = req.session.journey.officialVisit
    if (!officialVisitsService.visitIsAmendable(parseISO(visitDate), parseISO(startTime), visitStatusCode)) {
      req.session.journey.officialVisit = null
      return res.redirect(`/view/${officialVisitId}`)
    }
    return next()
  })

  // TODO: Fill in any further routes for cancellation
  route('/confirm', new CheckCancelHandler(officialVisitsService, prisonerService))

  return router
}
