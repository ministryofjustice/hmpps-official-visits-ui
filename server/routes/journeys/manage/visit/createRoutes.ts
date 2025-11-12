import { Router } from 'express'
import type { Services } from '../../../../services'
import { PageHandler } from '../../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../../middleware/validationMiddleware'
import CheckYourAnswersHandler from './handlers/checkYourAnswersHandler'
import ConfirmationHandler from './handlers/confirmationHandler'
import TimeSlotHandler from './handlers/timeSlotHandler'
import ReviewPrisonerHandler from './handlers/reviewPrisonerHandler'
import PrisonerSearchHandler from './handlers/prisonerSearchHandler'
import PrisonerSearchResultsHandler from './handlers/prisonerSearchResultsHandler'
import PrisonerSelectHandler from './handlers/prisonerSelectHandler'

export default function CreateRoutes({ auditService, prisonerService, officialVisitsService }: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  // Prisoner search steps
  route('/search', new PrisonerSearchHandler(prisonerService))
  route('/results', new PrisonerSearchResultsHandler(prisonerService))
  route('/prisoner-select', new PrisonerSelectHandler(prisonerService))

  route(`/review-prisoner`, new ReviewPrisonerHandler())

  // Subsequent steps require the official visit journey session data to exist
  router.use((req, res, next) => {
    if (!req.session.journey.officialVisit) {
      return res.redirect('/')
    }
    return next()
  })

  // These are the subsequent steps in the journey to create an official visit
  route(`/time-slot`, new TimeSlotHandler(officialVisitsService, prisonerService))
  route(`/check-your-answers`, new CheckYourAnswersHandler(officialVisitsService, prisonerService))
  route(`/confirmation/:officialVisitId`, new ConfirmationHandler(officialVisitsService, prisonerService))

  return router
}
