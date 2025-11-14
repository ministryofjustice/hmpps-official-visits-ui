import { Router } from 'express'
import type { Services } from '../../../../services'
import { PageHandler } from '../../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../../middleware/validationMiddleware'
import CheckYourAnswersHandler from './handlers/checkYourAnswersHandler'
import ConfirmationHandler from './handlers/confirmationHandler'
import TimeSlotHandler from './handlers/timeSlotHandler'
import PrisonerSearchHandler from './handlers/prisonerSearchHandler'
import PrisonerSearchResultsHandler from './handlers/prisonerSearchResultsHandler'
import PrisonerSelectHandler from './handlers/prisonerSelectHandler'
import VisitTypeHandler from './handlers/visitTypeHandler'
import ReviewScheduledEventsHandler from './handlers/reviewScheduledEventsHandler'
import SelectOfficialVisitorsHandler from './handlers/selectOfficialVisitorsHandler'
import SelectSocialVisitorsHandler from './handlers/selectSocialVisitorsHandler'
import AssistanceRequiredHandler from './handlers/assistanceRequiredHandler'
import EquipmentHandler from './handlers/equipmentHandler'

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
  route(`/confirmation/:officialVisitId`, new ConfirmationHandler(officialVisitsService, prisonerService))

  // Subsequent steps require the official visit journey session data to exist
  router.use((req, res, next) => {
    if (!req.session.journey.officialVisit) {
      return res.redirect('/')
    }
    return next()
  })

  // These are the subsequent steps in the journey to create an official visit
  route(`/visit-type`, new VisitTypeHandler(officialVisitsService))
  route(`/time-slot`, new TimeSlotHandler(officialVisitsService))
  route(`/review-scheduled-events`, new ReviewScheduledEventsHandler(officialVisitsService))
  route(`/select-official-visitors`, new SelectOfficialVisitorsHandler(officialVisitsService))
  route('/select-social-visitors', new SelectSocialVisitorsHandler(officialVisitsService))
  route('/assistance-required', new AssistanceRequiredHandler(officialVisitsService))
  route('/equipment', new EquipmentHandler(officialVisitsService))
  route(`/check-your-answers`, new CheckYourAnswersHandler(officialVisitsService, prisonerService))

  return router
}
