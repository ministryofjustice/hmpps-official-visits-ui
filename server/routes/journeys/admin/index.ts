import { Router } from 'express'
import type { Services } from '../../../services'
import { PageHandler } from '../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../middleware/validationMiddleware'
import DayHandler from './handlers/dayHandler'
import LocationHandler from './handlers/locationHandler'
import EditLocationHandler from './handlers/editLocationHandler'
import NewTimeSlotHandler from './handlers/newTimeSlotHandler'
import EditTimeSlotHandler from './handlers/editTimeSlotHandler'
import NewLocationHandler from './handlers/newLocationHandler'
import DeleteLocationHandler from './handlers/deleteLocationHandler'
import DeleteTimeSlotHandler from './handlers/deleteTimeSlotHandler'

export default function Index({ auditService, officialVisitsService }: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  route('/days', new DayHandler(officialVisitsService))
  route('/locations/time-slot/new', new NewTimeSlotHandler(officialVisitsService))
  route('/locations/time-slot/:timeSlotId/edit', new EditTimeSlotHandler(officialVisitsService))
  route('/locations/time-slot/:timeSlotId/location', new LocationHandler(officialVisitsService))
  route('/locations/time-slot/:timeSlotId/visit-slot/new', new NewLocationHandler(officialVisitsService))
  route('/locations/time-slot/:timeSlotId/visit-slot/:visitSlotId', new EditLocationHandler(officialVisitsService))
  route(
    '/locations/time-slot/:timeSlotId/visit-slot/:visitSlotId/delete',
    new DeleteLocationHandler(officialVisitsService),
  )
  route('/locations/time-slot/:timeSlotId/delete', new DeleteTimeSlotHandler(officialVisitsService))

  return router
}
