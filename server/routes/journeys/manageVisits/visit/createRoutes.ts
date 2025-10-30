import { Router } from 'express'
import type { Services } from '../../../../services'
import { PageHandler } from '../../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../../middleware/validationMiddleware'
import CheckYourAnswersHandler from './handlers/checkYourAnswersHandler'
import ConfirmationHandler from './handlers/confirmationHandler'
import TimeSlotHandler from './handlers/timeSlotHandler'

export default function CreateRoutes({ auditService, prisonerService, officialVisitsService }: Services): Router {
  const basePath = '/:prisonerNumber'
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  route(`${basePath}/official-visit/time-slot`, new TimeSlotHandler(officialVisitsService, prisonerService))
  route(
    `${basePath}/official-visit/confirmation/:officialVisitId`,
    new ConfirmationHandler(officialVisitsService, prisonerService),
  )

  // Some routes require the journey session data to exist
  router.use((req, res, next) => {
    if (!req.session.journey.officialVisit) {
      return res.redirect('/')
    }
    return next()
  })

  // These are the steps in the journey to create an official visit
  route(
    `${basePath}/official-visit/check-your-answers`,
    new CheckYourAnswersHandler(officialVisitsService, prisonerService),
  )

  return router
}
