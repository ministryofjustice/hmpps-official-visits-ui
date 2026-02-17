import { Router, Request, Response, NextFunction } from 'express'
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
import CommentsHandler from './handlers/commentsHandler'
import journeyStateGuard, { JourneyStateGuard } from '../../../../middleware/journey/journeyStateGuard'
import { socialVisitorsPageEnabled } from '../../../../utils/utils'
import CancellationCheckHandler from './handlers/cancellationCheckHandler'
import { getProgressTrackerState } from './createJourneyState'
import { Page } from '../../../../services/auditService'

export const routePage: Record<string, Page> = {}

export default function CreateRoutes({
  auditService,
  prisonerService,
  officialVisitsService,
  personalRelationshipsService,
  activitiesService,
  telemetryService,
}: Services): Router {
  const router = Router({ mergeParams: true })

  const addStepsChecked = (handler: PageHandler) => async (_: Request, res: Response, next: NextFunction) => {
    res.locals.stepsChecked = getProgressTrackerState(handler.PAGE_NAME)
    return next()
  }

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), addStepsChecked(handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  if (process.env.NODE_ENV !== 'test') {
    router.use(journeyStateGuard(guard))
  }

  route('/search', new PrisonerSearchHandler(prisonerService, telemetryService))
  route('/results', new PrisonerSearchResultsHandler(prisonerService, telemetryService))
  route('/prisoner-select', new PrisonerSelectHandler(prisonerService, personalRelationshipsService, telemetryService))
  route(
    `/confirmation/:officialVisitId`,
    new ConfirmationHandler(officialVisitsService, prisonerService, telemetryService),
  )

  // Subsequent steps require the official visit journey session data to exist
  router.use((req, res, next) => {
    if (!req.session.journey.officialVisit) {
      return res.redirect('/')
    }
    return next()
  })

  // These are the subsequent steps in the journey to create an official visit
  route(`/visit-type`, new VisitTypeHandler(officialVisitsService, telemetryService))
  route(`/time-slot`, new TimeSlotHandler(officialVisitsService, activitiesService, telemetryService))
  route(`/review-scheduled-events`, new ReviewScheduledEventsHandler(officialVisitsService))
  route(`/select-official-visitors`, new SelectOfficialVisitorsHandler(officialVisitsService, telemetryService))
  route('/select-social-visitors', new SelectSocialVisitorsHandler(officialVisitsService, telemetryService))
  route('/assistance-required', new AssistanceRequiredHandler(telemetryService))
  route('/equipment', new EquipmentHandler(officialVisitsService, telemetryService))
  route('/comments', new CommentsHandler(telemetryService))
  route(`/check-your-answers`, new CheckYourAnswersHandler(officialVisitsService, telemetryService))
  route('/cancellation-check', new CancellationCheckHandler())

  return router
}

const guard: JourneyStateGuard = {
  search: _req => {
    return undefined
  },
  results: req => {
    return req.session.journey.officialVisit?.searchTerm?.length > 1 ? undefined : '/search'
  },
  'visit-type': req => {
    return req.session.journey.officialVisit?.prisoner ? undefined : '/results'
  },
  'time-slot': req => {
    return req.session.journey.officialVisit?.visitType ? undefined : '/visit-type'
  },
  'select-official-visitors': req => {
    return req.session.journey.officialVisit?.selectedTimeSlot ? undefined : '/time-slot'
  },
  'select-social-visitors': req => {
    // If this page is not enabled, push back to the previous page.
    // The JourneyStateGuard is designed as a 'last resort' and for pushing the user back
    // Proper navigation should be handled by the individual page handlers.
    if (!req.session.journey.officialVisit?.officialVisitors?.length || !socialVisitorsPageEnabled(req)) {
      return '/select-official-visitors'
    }
    return undefined
  },
  'assistance-required': req => {
    if (socialVisitorsPageEnabled(req)) {
      return req.session.journey.officialVisit?.socialVisitorsPageCompleted ? undefined : '/select-social-visitors'
    }
    return req.session.journey.officialVisit?.officialVisitors?.length ? undefined : '/select-official-visitors'
  },
  equipment: req => {
    return req.session.journey.officialVisit?.assistancePageCompleted ? undefined : '/assistance-required'
  },
  comments: req => {
    if (req.session.journey.officialVisit?.visitType === 'IN_PERSON') {
      return req.session.journey.officialVisit?.equipmentPageCompleted ? undefined : '/equipment'
    }
    return req.session.journey.officialVisit?.assistancePageCompleted ? undefined : '/assistance-required'
  },
  'check-your-answers': req => {
    return req.session.journey.officialVisit?.commentsPageCompleted ? undefined : '/comments'
  },
  confirmation: req => {
    return req.session.journey.journeyCompleted ? undefined : '/check-answers'
  },
}
