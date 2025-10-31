import { Router } from 'express'
import type { Services } from '../services'
import home from './journeys/home'
import prisonerSearch from './journeys/manage/prisoner-search'
import manageVisits from './journeys/manage/visit'
import viewVisits from './journeys/view'

export default function routes(_services: Services): Router {
  const router = Router()

  router.use('/', home(_services))
  router.use('/prisoner-search', prisonerSearch(_services))
  router.use('/manage', manageVisits(_services))
  router.use('/view', viewVisits(_services))

  return router
}
