import { Router } from 'express'
import type { Services } from '../../../services'
import { PageHandler } from '../../interfaces/pageHandler'
import validationMiddleware, { validateOnGET } from '../../../middleware/validationMiddleware'
import ViewOfficialVisitListHandler from './handlers/viewOfficialVisitListHandler'
import ViewOfficialVisitHandler from './handlers/viewOfficialVisitHandler'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import CompleteOfficialVisitHandler from './handlers/completeVisitHandler'
import CancelOfficialVisitHandler from './handlers/cancelVisitHandler'

export default function Index({
  auditService,
  prisonerService,
  officialVisitsService,
  personalRelationshipsService,
}: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(
      path,
      validateOnGET(handler.QUERY, 'startDate', 'endDate'),
      logPageViewMiddleware(auditService, handler),
      handler.GET,
    ) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  route('/list', new ViewOfficialVisitListHandler(officialVisitsService))
  route(
    '/visit/:ovId',
    new ViewOfficialVisitHandler(officialVisitsService, prisonerService, personalRelationshipsService),
  )
  route('/visit/:ovId/complete', new CompleteOfficialVisitHandler(officialVisitsService))
  route('/visit/:ovId/cancel', new CancelOfficialVisitHandler(officialVisitsService))

  return router
}
