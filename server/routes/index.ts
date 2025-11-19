import { Router } from 'express'
import type { Services } from '../services'
import home from './journeys/home'
import manageVisits from './journeys/manage/visit'
import viewVisits from './journeys/view'
import timeslots from './timetable'
import config from '../config'
import asyncMiddleware from '../middleware/asyncMiddleware'
import preventNavigationToExpiredJourneys from '../middleware/journey/preventNavigationToExpiredJourneys'
import redirectCheckAnswersMiddleware from '../middleware/journey/redirectCheckAnswers'
import PrisonerImageRoutes from './prisonerImage/prisonerImageRoutes'

export default function routes(_services: Services): Router {
  const router = Router()
  router.use((req, res, next) => (config.maintenanceMode ? res.render('pages/maintenanceMode') : next()))
  router.use('/', home(_services))
  router.use(preventNavigationToExpiredJourneys([/confirmation(\/[0-9a-zA-Z-]+)$/]))
  router.use(redirectCheckAnswersMiddleware([/check-your-answers$/]))
  router.use('/timeslots', timeslots(_services))
  router.use('/manage', manageVisits(_services))
  router.use('/view', viewVisits(_services))
  router.get(
    '/prisoner-image/:prisonerNumber',
    asyncMiddleware(new PrisonerImageRoutes(_services.prisonerImageService).GET),
  )

  return router
}
