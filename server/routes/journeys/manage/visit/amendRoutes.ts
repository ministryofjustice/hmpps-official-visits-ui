import { Router } from 'express'
import type { Services } from '../../../../services'
import { PageHandler } from '../../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../../middleware/validationMiddleware'
import CheckYourAnswersHandler from './handlers/checkYourAnswersHandler'
import TimeSlotHandler from './handlers/timeSlotHandler'
import VisitTypeHandler from './handlers/visitTypeHandler'
import ReviewScheduledEventsHandler from './handlers/reviewScheduledEventsHandler'
import SelectOfficialVisitorsHandler from './handlers/selectOfficialVisitorsHandler'
import SelectSocialVisitorsHandler from './handlers/selectSocialVisitorsHandler'
import AssistanceRequiredHandler from './handlers/assistanceRequiredHandler'
import EquipmentHandler from './handlers/equipmentHandler'
import CommentsHandler from './handlers/commentsHandler'
import CancellationCheckHandler from './handlers/cancellationCheckHandler'
import AmendVisitLandingHandler from './handlers/amendVisitLandingHandler'

export default function AmendRoutes({
  auditService,
  prisonerService,
  officialVisitsService,
  activitiesService,
  personalRelationshipsService,
  manageUsersService,
}: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  route(
    '/',
    new AmendVisitLandingHandler(
      officialVisitsService,
      prisonerService,
      personalRelationshipsService,
      manageUsersService,
    ),
  )

  // Subsequent steps require the official visit journey session data to exist
  router.use((req, res, next) => {
    if (!req.session.journeyData[req.params.journeyId]) {
      return res.redirect('/')
    }
    return next()
  })

  // These are the subsequent steps in the journey to create an official visit
  route(`/visit-type`, new VisitTypeHandler(officialVisitsService))
  route(`/time-slot`, new TimeSlotHandler(officialVisitsService, activitiesService))
  route(`/review-scheduled-events`, new ReviewScheduledEventsHandler(officialVisitsService))
  route(`/select-official-visitors`, new SelectOfficialVisitorsHandler(officialVisitsService))
  route('/select-social-visitors', new SelectSocialVisitorsHandler(officialVisitsService))
  route('/assistance-required', new AssistanceRequiredHandler(officialVisitsService))
  route('/equipment', new EquipmentHandler(officialVisitsService))
  route('/comments', new CommentsHandler())
  route(`/check-your-answers`, new CheckYourAnswersHandler(officialVisitsService))
  route('/cancellation-check', new CancellationCheckHandler())

  return router
}
