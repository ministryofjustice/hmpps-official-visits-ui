import { Router } from 'express'
import type { Services } from '../../../services'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import { requirePermissions } from '../../../middleware/requirePermissions'
import { Permission } from '../../../interfaces/hmppsUser'
import VisitsNeedReviewHandler from './handlers/visitsNeedReviewHandler'

export default function Index({ auditService, officialVisitsService, telemetryService }: Services): Router {
  const router = Router({ mergeParams: true })

  const listHandler = new VisitsNeedReviewHandler(officialVisitsService, telemetryService)

  router.get(
    '/list',
    requirePermissions('OV', Permission.VIEW),
    logPageViewMiddleware(auditService, listHandler),
    listHandler.GET,
  )

  router.post('/list/:officialVisitId/acknowledge', requirePermissions('OV', Permission.MANAGE), async (req, res) => {
    const prisonCode = res.locals.user.activeCaseLoadId
    const officialVisitId = Number(req.params.officialVisitId)

    await officialVisitsService.acknowledgeVisitReview(prisonCode, officialVisitId, res.locals.user)

    const returnTo = req.body?.returnTo as string
    return res.redirect(returnTo?.startsWith('/review/list') ? returnTo : '/review/list')
  })

  return router
}
