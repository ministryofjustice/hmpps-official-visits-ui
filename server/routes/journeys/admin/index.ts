import { Router } from 'express'
import type { Services } from '../../../services'
import { PageHandler } from '../../interfaces/pageHandler'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../middleware/validationMiddleware'
import TimeSlotsHandler from './handlers/timeSlotsHandler'
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

  route('/time-slots', new TimeSlotsHandler(officialVisitsService))
  route('/time-slot/new', new NewTimeSlotHandler(officialVisitsService))
  route('/time-slot/:timeSlotId/edit', new EditTimeSlotHandler(officialVisitsService))
  route('/time-slot/:timeSlotId/delete', new DeleteTimeSlotHandler(officialVisitsService))
  route('/time-slot/:timeSlotId/locations', new LocationHandler(officialVisitsService))
  route('/time-slot/:timeSlotId/location/new', new NewLocationHandler(officialVisitsService))
  route('/time-slot/:timeSlotId/location/:locationId/edit', new EditLocationHandler(officialVisitsService))
  route('/time-slot/:timeSlotId/location/:locationId/delete', new DeleteLocationHandler(officialVisitsService))

  return router
}
