import { Router } from 'express'
import type { Services } from '../../../services'
import { PageHandler } from '../../interfaces/pageHandler'
import validationMiddleware, { validateOnGET } from '../../../middleware/validationMiddleware'
import ViewOfficialVisitListHandler from './handlers/viewOfficialVisitListHandler'
import ViewOfficialVisitHandler from './handlers/viewOfficialVisitHandler'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import CompleteOfficialVisitHandler from './handlers/completeVisitHandler'
import CancelOfficialVisitHandler from './handlers/cancelVisitHandler'
import { requirePermissions } from '../../../middleware/requirePermissions'
import { Permission } from '../../../interfaces/hmppsUser'
import OfficialVisitMovementSlipHandler from './handlers/movementSlipHandler'

export default function Index({
  auditService,
  prisonerService,
  officialVisitsService,
  personalRelationshipsService,
  manageUsersService,
}: Services): Router {
  const router = Router({ mergeParams: true })

  const route = (path: string | string[], permission: Permission, handler: PageHandler) =>
    router.get(
      path,
      requirePermissions('OV', permission),
      validateOnGET(handler.QUERY, 'startDate', 'endDate'),
      logPageViewMiddleware(auditService, handler),
      handler.GET,
    ) &&
    handler.POST &&
    router.post(path, validationMiddleware(handler.BODY), handler.POST)

  route('/list', Permission.DEFAULT, new ViewOfficialVisitListHandler(officialVisitsService))
  route(
    '/visit/:ovId',
    Permission.VIEW,
    new ViewOfficialVisitHandler(
      officialVisitsService,
      prisonerService,
      personalRelationshipsService,
      manageUsersService,
    ),
  )
  route('/visit/:ovId/complete', Permission.MANAGE, new CompleteOfficialVisitHandler(officialVisitsService))
  route('/visit/:ovId/cancel', Permission.MANAGE, new CancelOfficialVisitHandler(officialVisitsService))
  route('/visit/:ovId/movement-slip', Permission.VIEW, new OfficialVisitMovementSlipHandler(officialVisitsService))

  return router
}
