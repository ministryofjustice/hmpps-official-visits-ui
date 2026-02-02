import { Router } from 'express'
import type { Services } from '../services'
import home from './journeys/home'
import manageVisits from './journeys/manage/visit'
import viewVisits from './journeys/view'
import config from '../config'
import preventNavigationToExpiredJourneys from '../middleware/journey/preventNavigationToExpiredJourneys'
import redirectCheckAnswersMiddleware from '../middleware/journey/redirectCheckAnswers'
import PrisonerImageRoutes from './prisonerImage/prisonerImageRoutes'
import { populateUserPermissions } from '../middleware/populateUserPermissions'
import { requirePermissions } from '../middleware/requirePermissions'
import { BitPermission } from '../interfaces/hmppsUser'

export default function routes(_services: Services): Router {
  const router = Router()
  router.use((req, res, next) => (config.maintenanceMode ? res.render('pages/maintenanceMode') : next()))
  router.use(populateUserPermissions)
  // Demonstrate locking routes behind permissions - in reality this does nothing with UserPermissionLevel.DEFAULT
  router.use('/', requirePermissions('OV', BitPermission.DEFAULT), home(_services))
  router.use(preventNavigationToExpiredJourneys([/confirmation(\/[0-9a-zA-Z-]+)$/]))
  router.use(redirectCheckAnswersMiddleware([/check-your-answers$/]))
  router.use('/manage', manageVisits(_services))
  router.use('/view', viewVisits(_services))
  router.get('/prisoner-image/:prisonerNumber', new PrisonerImageRoutes(_services.prisonerImageService).GET)

  return router
}
