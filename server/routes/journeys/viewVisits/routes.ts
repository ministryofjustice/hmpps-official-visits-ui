import { Router } from 'express'
import type { Services } from '../../../services'
import { PageHandler } from '../../interfaces/pageHandler'
import validationMiddleware from '../../../middleware/validationMiddleware'
import ViewOfficialVisitListHandler from './handlers/viewOfficialVisitListHandler'
import ViewOfficialVisitHandler from './handlers/viewOfficialVisitHandler'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'

export default function Index({ auditService, prisonerService, officialVisitsService }: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], handler: PageHandler) =>
    router.get(path, logPageViewMiddleware(auditService, handler), handler.GET) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  route('/', new ViewOfficialVisitListHandler(officialVisitsService, prisonerService))
  route('/:officialVisitId', new ViewOfficialVisitHandler(officialVisitsService, prisonerService))

  return router
}
