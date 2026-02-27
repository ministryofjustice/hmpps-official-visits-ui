import { Router } from 'express'
import type { Services } from '../../../services'
import { PageHandler } from '../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../middleware/validationMiddleware'
import DayHandler from './handlers/dayHandler'
import LocationHandler from './handlers/locationHandler'
import VisitSlotHandler from './handlers/visitSlotHandler'
import NewTimeSlotHandler from './handlers/newTimeSlotHandler'

export default function Index({ auditService, officialVisitsService }: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  route('/days', new DayHandler(officialVisitsService))
  route('/locations/time-slot/new', new NewTimeSlotHandler(officialVisitsService))
  route('/locations/time-slot/:timeSlotId', new LocationHandler(officialVisitsService))
  route('/locations/time-slot/:timeSlotId/visit-slot/:visitSlotId', new VisitSlotHandler(officialVisitsService))

  return router
}
