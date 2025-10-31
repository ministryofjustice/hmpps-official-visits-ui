import { Router } from 'express'
import { parseISO } from 'date-fns'
import type { Services } from '../../../../services'
import { PageHandler } from '../../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../../middleware/validationMiddleware'
import TimeSlotHandler from './handlers/timeSlotHandler'
import CheckYourAnswersHandler from './handlers/checkYourAnswersHandler'
import ConfirmationHandler from './handlers/confirmationHandler'

export default function AmendRoutes({ auditService, prisonerService, officialVisitsService }: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  route('/official-visit/confirmation', new ConfirmationHandler(officialVisitsService, prisonerService))

  router.use((req, res, next) => {
    const { officialVisitId, visitDate, startTime, visitStatusCode } = req.session.journey.officialVisit
    if (!officialVisitsService.visitIsAmendable(parseISO(visitDate), parseISO(startTime), visitStatusCode)) {
      req.session.journey.officialVisit = null
      return res.redirect(`/view/official-visit/${officialVisitId}`)
    }

    return next()
  })

  // TODO: Fill in the routes for amending an official visit
  route('/official-visit/choose-time-slot', new TimeSlotHandler(officialVisitsService, prisonerService))
  route('/official-visit/check-your-answers', new CheckYourAnswersHandler(officialVisitsService, prisonerService))

  return router
}
