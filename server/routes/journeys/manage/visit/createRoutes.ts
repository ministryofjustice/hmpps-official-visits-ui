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
import CommentsHandler from './handlers/commentsHandler'
import journeyStateGuard, { JourneyStateGuard } from '../../../../middleware/journey/journeyStateGuard'
import { socialVisitorsPageEnabled } from '../../../../utils/utils'

export default function CreateRoutes({
  auditService,
  prisonerService,
  officialVisitsService,
  personalRelationshipsService,
  activitiesService,
}: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  if (process.env.NODE_ENV !== 'test') {
    router.use(journeyStateGuard(guard))
  }

  route('/search', new PrisonerSearchHandler(prisonerService))
  route('/results', new PrisonerSearchResultsHandler(prisonerService))
  route('/prisoner-select', new PrisonerSelectHandler(prisonerService, personalRelationshipsService))
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
  route(`/time-slot`, new TimeSlotHandler(officialVisitsService, activitiesService))
  route(`/review-scheduled-events`, new ReviewScheduledEventsHandler(officialVisitsService))
  route(`/select-official-visitors`, new SelectOfficialVisitorsHandler(officialVisitsService))
  route('/select-social-visitors', new SelectSocialVisitorsHandler(officialVisitsService))
  route('/assistance-required', new AssistanceRequiredHandler(officialVisitsService))
  route('/equipment', new EquipmentHandler(officialVisitsService))
  route('/comments', new CommentsHandler(officialVisitsService))
  route(`/check-your-answers`, new CheckYourAnswersHandler(officialVisitsService))

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
